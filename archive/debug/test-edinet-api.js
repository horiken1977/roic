#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const { exec } = require('child_process');
const execPromise = promisify(exec);

// 三菱電機の書類ID
const MITSUBISHI_DOC_ID = 'S100W0EM';
// You need to set your EDINET API key here or as environment variable
const EDINET_API_KEY = process.env.EDINET_API_KEY || 'your_api_key_here';

async function fetchEdinetDocument(docId, apiKey) {
    console.log(`\n=== Fetching EDINET document: ${docId} ===`);
    
    // type=1 for XBRL, type=5 for ZIP with CSV
    const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents/${docId}?type=1&Subscription-Key=${apiKey}`;
    console.log('API URL:', url.replace(apiKey, '***'));
    
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            console.log('Response Status:', response.statusCode);
            console.log('Response Headers:', response.headers);
            
            const chunks = [];
            let totalSize = 0;
            
            response.on('data', (chunk) => {
                chunks.push(chunk);
                totalSize += chunk.length;
            });
            
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                console.log('Total response size:', totalSize, 'bytes');
                
                // First 100 bytes
                console.log('\nFirst 100 bytes (hex):', buffer.slice(0, 100).toString('hex'));
                console.log('First 100 bytes (ASCII):', buffer.slice(0, 100).toString('ascii').replace(/[^\x20-\x7E]/g, '.'));
                
                // Check if it's a ZIP file
                const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
                console.log('\nIs ZIP file?', isZip);
                
                // Check if it's XML
                const xmlStart = buffer.slice(0, 100).toString('utf8');
                const isXml = xmlStart.includes('<?xml') || xmlStart.includes('<xbrl');
                console.log('Is XML file?', isXml);
                
                resolve(buffer);
            });
            
            response.on('error', reject);
        }).on('error', reject);
    });
}

async function saveAndExtractZip(buffer, docId) {
    const tempDir = path.join(__dirname, 'temp');
    const zipPath = path.join(tempDir, `${docId}.zip`);
    const extractDir = path.join(tempDir, docId);
    
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Save ZIP file
    await writeFile(zipPath, buffer);
    console.log(`\nSaved ZIP file to: ${zipPath}`);
    
    // Extract ZIP file
    try {
        await execPromise(`unzip -o "${zipPath}" -d "${extractDir}"`);
        console.log(`Extracted to: ${extractDir}`);
        
        // List extracted files
        const { stdout } = await execPromise(`ls -la "${extractDir}"`);
        console.log('\nExtracted files:\n', stdout);
        
        // Look for CSV files
        const { stdout: csvFiles } = await execPromise(`find "${extractDir}" -name "*.csv" | head -5`);
        console.log('\nCSV files found:\n', csvFiles);
        
        // Read first CSV file
        if (csvFiles.trim()) {
            const firstCsv = csvFiles.trim().split('\n')[0];
            const { stdout: csvContent } = await execPromise(`head -20 "${firstCsv}"`);
            console.log(`\nFirst 20 lines of ${path.basename(firstCsv)}:\n`, csvContent);
            
            // Check for specific financial data tags
            const { stdout: financialData } = await execPromise(`grep -E "(NetSales|OperatingIncome|TotalAssets|営業収益|営業利益|資産合計)" "${firstCsv}" | head -10 || true`);
            console.log('\nFinancial data found:\n', financialData || 'No matching financial data found');
        }
        
        // Look for XBRL files
        const { stdout: xbrlFiles } = await execPromise(`find "${extractDir}" -name "*.xbrl" -o -name "*.xml" | head -5`);
        console.log('\nXBRL/XML files found:\n', xbrlFiles || 'No XBRL/XML files found');
        
    } catch (error) {
        console.error('Error extracting ZIP:', error.message);
    }
}

async function testDirectXbrlParsing(buffer) {
    console.log('\n=== Testing direct XBRL parsing ===');
    
    // Try to parse as XML directly
    const content = buffer.toString('utf8');
    const isValidXml = content.includes('<?xml') || content.includes('<xbrl');
    
    if (isValidXml) {
        console.log('Content appears to be XML/XBRL');
        
        // Look for specific tags
        const tagPatterns = [
            'NetSales',
            'OperatingIncome',
            'TotalAssets',
            'ShareholdersEquity',
            '営業収益',
            '営業利益',
            '資産合計',
            '純資産合計'
        ];
        
        tagPatterns.forEach(tag => {
            const regex = new RegExp(`<[^>]*${tag}[^>]*>([^<]+)<`, 'gi');
            const matches = content.match(regex);
            if (matches) {
                console.log(`Found ${tag}:`, matches.slice(0, 3));
            }
        });
    } else {
        console.log('Content is not valid XML/XBRL');
    }
}

async function main() {
    try {
        if (EDINET_API_KEY === 'your_api_key_here') {
            console.error('\n❌ Please set your EDINET API key in the script or as environment variable EDINET_API_KEY');
            console.log('\nTo run this test:');
            console.log('1. Get your API key from https://disclosure.edinet-fsa.go.jp/');
            console.log('2. Run: EDINET_API_KEY=your_actual_key node test-edinet-api.js');
            return;
        }
        
        // Test Mitsubishi Electric document
        const buffer = await fetchEdinetDocument(MITSUBISHI_DOC_ID, EDINET_API_KEY);
        
        // Check if it's a ZIP file
        const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
        
        if (isZip) {
            await saveAndExtractZip(buffer, MITSUBISHI_DOC_ID);
        } else {
            await testDirectXbrlParsing(buffer);
        }
        
        console.log('\n=== Test Summary ===');
        console.log('1. The EDINET API returns a ZIP file for type=5');
        console.log('2. The ZIP contains CSV files with financial data');
        console.log('3. The current parsing logic needs to handle ZIP extraction');
        console.log('4. Financial data should be extracted from CSV files, not XML');
        
        // Clean up
        const tempDir = path.join(__dirname, 'temp');
        if (fs.existsSync(tempDir)) {
            await execPromise(`rm -rf "${tempDir}"`);
            console.log('\nCleaned up temporary files');
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the test
main();