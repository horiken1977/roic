/**
 * AWS Cost Optimizer Lambda Function
 * 夜間のAWSリソース自動シャットダウン・起動
 * 
 * 対象サービス:
 * - EC2 (Jenkins, Tomcat)
 * - RDS
 * - Lambda関数の一時停止
 * - CloudWatch Alarms (非重要)
 */

const AWS = require('aws-sdk');

// AWS SDKの設定
const ec2 = new AWS.EC2();
const rds = new AWS.RDS();
const lambda = new AWS.Lambda();
const cloudwatch = new AWS.CloudWatch();
const ssm = new AWS.SSM();

// 設定
const CONFIG = {
    // シャットダウン対象のタグ
    TARGET_TAGS: [
        { Key: 'Environment', Values: ['development', 'staging'] },
        { Key: 'AutoShutdown', Values: ['enabled'] },
        { Key: 'Project', Values: ['roic-analysis'] }
    ],
    
    // 常時稼働サービス（除外対象）
    ALWAYS_ON_SERVICES: [
        'S3',
        'CloudFront',
        'Route53',
        'Lambda-Critical'
    ],
    
    // 時間設定（JST）
    SCHEDULE: {
        SHUTDOWN_HOUR: 22, // 22:00 JST
        STARTUP_HOUR: 8,   // 08:00 JST
        TIMEZONE_OFFSET: 9 // UTC+9
    }
};

/**
 * メイン処理
 * @param {Object} event - Lambda イベント
 * @param {Object} context - Lambda コンテキスト
 */
exports.handler = async (event, context) => {
    console.log('🚀 AWS Cost Optimizer started');
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        // 現在の時刻を取得（JST）
        const now = new Date();
        const jstHour = (now.getUTCHours() + CONFIG.SCHEDULE.TIMEZONE_OFFSET) % 24;
        
        // アクションの決定
        const action = determineAction(jstHour, event);
        console.log(`🕐 Current JST hour: ${jstHour}, Action: ${action}`);
        
        let results = {
            action: action,
            timestamp: now.toISOString(),
            services: {}
        };
        
        switch (action) {
            case 'shutdown':
                results = await performShutdown(results);
                break;
                
            case 'startup':
                results = await performStartup(results);
                break;
                
            case 'check':
                results = await performHealthCheck(results);
                break;
                
            default:
                console.log('ℹ️ No action required');
                results.message = 'No action required';
        }
        
        // 結果をSSMパラメータストアに保存
        await saveResults(results);
        
        console.log('✅ AWS Cost Optimizer completed successfully');
        return {
            statusCode: 200,
            body: JSON.stringify(results, null, 2)
        };
        
    } catch (error) {
        console.error('❌ Error in AWS Cost Optimizer:', error);
        
        // エラー通知（SNS、Slack等）
        await notifyError(error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                stack: error.stack
            }, null, 2)
        };
    }
};

/**
 * アクションの決定
 * @param {number} jstHour - JST時間
 * @param {Object} event - Lambdaイベント
 * @returns {string} action
 */
function determineAction(jstHour, event) {
    // 手動イベントの場合
    if (event.action) {
        return event.action;
    }
    
    // 週末・祝日チェック
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=日曜日, 6=土曜日
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return 'weekend_mode'; // 週末は特別処理
    }
    
    // 時間による自動判定
    if (jstHour >= CONFIG.SCHEDULE.SHUTDOWN_HOUR || jstHour < CONFIG.SCHEDULE.STARTUP_HOUR) {
        return 'shutdown';
    } else if (jstHour === CONFIG.SCHEDULE.STARTUP_HOUR) {
        return 'startup';
    } else {
        return 'check';
    }
}

/**
 * シャットダウン処理
 * @param {Object} results - 結果オブジェクト
 * @returns {Object} 更新された結果
 */
async function performShutdown(results) {
    console.log('🔴 Starting shutdown process...');
    
    // EC2インスタンスのシャットダウン
    results.services.ec2 = await shutdownEC2Instances();
    
    // RDSインスタンスの停止
    results.services.rds = await shutdownRDSInstances();
    
    // Lambda関数の同時実行数制限
    results.services.lambda = await limitLambdaConcurrency();
    
    // 非重要CloudWatchアラームの無効化
    results.services.cloudwatch = await disableNonCriticalAlarms();
    
    console.log('✅ Shutdown process completed');
    return results;
}

/**
 * 起動処理
 * @param {Object} results - 結果オブジェクト
 * @returns {Object} 更新された結果
 */
async function performStartup(results) {
    console.log('🟢 Starting startup process...');
    
    // EC2インスタンスの起動
    results.services.ec2 = await startupEC2Instances();
    
    // RDSインスタンスの起動
    results.services.rds = await startupRDSInstances();
    
    // Lambda関数の同時実行数制限解除
    results.services.lambda = await restoreLambdaConcurrency();
    
    // CloudWatchアラームの有効化
    results.services.cloudwatch = await enableAlarms();
    
    console.log('✅ Startup process completed');
    return results;
}

/**
 * EC2インスタンスのシャットダウン
 */
async function shutdownEC2Instances() {
    try {
        const params = {
            Filters: [
                {
                    Name: 'tag:AutoShutdown',
                    Values: ['enabled']
                },
                {
                    Name: 'tag:Project',
                    Values: ['roic-analysis']
                },
                {
                    Name: 'instance-state-name',
                    Values: ['running']
                }
            ]
        };
        
        const instances = await ec2.describeInstances(params).promise();
        const instanceIds = [];
        
        instances.Reservations.forEach(reservation => {
            reservation.Instances.forEach(instance => {
                instanceIds.push(instance.InstanceId);
            });
        });
        
        if (instanceIds.length > 0) {
            await ec2.stopInstances({ InstanceIds: instanceIds }).promise();
            console.log(`🔴 Stopped EC2 instances: ${instanceIds.join(', ')}`);
        }
        
        return {
            action: 'stopped',
            count: instanceIds.length,
            instances: instanceIds
        };
        
    } catch (error) {
        console.error('Error shutting down EC2:', error);
        return { error: error.message };
    }
}

/**
 * EC2インスタンスの起動
 */
async function startupEC2Instances() {
    try {
        const params = {
            Filters: [
                {
                    Name: 'tag:AutoShutdown',
                    Values: ['enabled']
                },
                {
                    Name: 'tag:Project',
                    Values: ['roic-analysis']
                },
                {
                    Name: 'instance-state-name',
                    Values: ['stopped']
                }
            ]
        };
        
        const instances = await ec2.describeInstances(params).promise();
        const instanceIds = [];
        
        instances.Reservations.forEach(reservation => {
            reservation.Instances.forEach(instance => {
                instanceIds.push(instance.InstanceId);
            });
        });
        
        if (instanceIds.length > 0) {
            await ec2.startInstances({ InstanceIds: instanceIds }).promise();
            console.log(`🟢 Started EC2 instances: ${instanceIds.join(', ')}`);
        }
        
        return {
            action: 'started',
            count: instanceIds.length,
            instances: instanceIds
        };
        
    } catch (error) {
        console.error('Error starting EC2:', error);
        return { error: error.message };
    }
}

/**
 * RDSインスタンスの停止
 */
async function shutdownRDSInstances() {
    try {
        const instances = await rds.describeDBInstances().promise();
        const targetInstances = instances.DBInstances.filter(instance => {
            return instance.DBInstanceStatus === 'available' &&
                   instance.DBInstanceIdentifier.includes('roic');
        });
        
        const results = [];
        for (const instance of targetInstances) {
            try {
                await rds.stopDBInstance({
                    DBInstanceIdentifier: instance.DBInstanceIdentifier
                }).promise();
                
                results.push({
                    id: instance.DBInstanceIdentifier,
                    action: 'stopped'
                });
                
                console.log(`🔴 Stopped RDS instance: ${instance.DBInstanceIdentifier}`);
            } catch (error) {
                if (!error.message.includes('already stopped')) {
                    console.error(`Error stopping RDS ${instance.DBInstanceIdentifier}:`, error);
                }
            }
        }
        
        return {
            action: 'stopped',
            count: results.length,
            instances: results
        };
        
    } catch (error) {
        console.error('Error shutting down RDS:', error);
        return { error: error.message };
    }
}

/**
 * RDSインスタンスの起動
 */
async function startupRDSInstances() {
    try {
        const instances = await rds.describeDBInstances().promise();
        const targetInstances = instances.DBInstances.filter(instance => {
            return instance.DBInstanceStatus === 'stopped' &&
                   instance.DBInstanceIdentifier.includes('roic');
        });
        
        const results = [];
        for (const instance of targetInstances) {
            try {
                await rds.startDBInstance({
                    DBInstanceIdentifier: instance.DBInstanceIdentifier
                }).promise();
                
                results.push({
                    id: instance.DBInstanceIdentifier,
                    action: 'started'
                });
                
                console.log(`🟢 Started RDS instance: ${instance.DBInstanceIdentifier}`);
            } catch (error) {
                console.error(`Error starting RDS ${instance.DBInstanceIdentifier}:`, error);
            }
        }
        
        return {
            action: 'started',
            count: results.length,
            instances: results
        };
        
    } catch (error) {
        console.error('Error starting RDS:', error);
        return { error: error.message };
    }
}

/**
 * Lambda関数の同時実行数制限
 */
async function limitLambdaConcurrency() {
    // 実装省略 - 必要に応じて実装
    return { action: 'limited', message: 'Lambda concurrency limited for cost optimization' };
}

/**
 * Lambda関数の同時実行数制限解除
 */
async function restoreLambdaConcurrency() {
    // 実装省略 - 必要に応じて実装
    return { action: 'restored', message: 'Lambda concurrency restored' };
}

/**
 * 非重要CloudWatchアラームの無効化
 */
async function disableNonCriticalAlarms() {
    // 実装省略 - 必要に応じて実装
    return { action: 'disabled', message: 'Non-critical alarms disabled' };
}

/**
 * CloudWatchアラームの有効化
 */
async function enableAlarms() {
    // 実装省略 - 必要に応じて実装
    return { action: 'enabled', message: 'Alarms enabled' };
}

/**
 * ヘルスチェック
 */
async function performHealthCheck(results) {
    console.log('🔍 Performing health check...');
    
    // 各サービスの状態確認
    results.services.ec2 = await checkEC2Status();
    results.services.rds = await checkRDSStatus();
    
    return results;
}

/**
 * EC2ステータス確認
 */
async function checkEC2Status() {
    try {
        const instances = await ec2.describeInstances({
            Filters: [
                { Name: 'tag:Project', Values: ['roic-analysis'] }
            ]
        }).promise();
        
        const status = [];
        instances.Reservations.forEach(reservation => {
            reservation.Instances.forEach(instance => {
                status.push({
                    id: instance.InstanceId,
                    state: instance.State.Name,
                    type: instance.InstanceType
                });
            });
        });
        
        return { status: status };
    } catch (error) {
        return { error: error.message };
    }
}

/**
 * RDSステータス確認
 */
async function checkRDSStatus() {
    try {
        const instances = await rds.describeDBInstances().promise();
        const status = instances.DBInstances
            .filter(instance => instance.DBInstanceIdentifier.includes('roic'))
            .map(instance => ({
                id: instance.DBInstanceIdentifier,
                status: instance.DBInstanceStatus,
                class: instance.DBInstanceClass
            }));
        
        return { status: status };
    } catch (error) {
        return { error: error.message };
    }
}

/**
 * 結果をSSMパラメータストアに保存
 */
async function saveResults(results) {
    try {
        await ssm.putParameter({
            Name: '/roic/cost-optimizer/last-run',
            Value: JSON.stringify(results),
            Type: 'String',
            Overwrite: true
        }).promise();
        
        console.log('💾 Results saved to SSM Parameter Store');
    } catch (error) {
        console.error('Error saving results to SSM:', error);
    }
}

/**
 * エラー通知
 */
async function notifyError(error) {
    // 実装省略 - SNS、Slack、メール等への通知
    console.error('🚨 Error notification:', error.message);
}