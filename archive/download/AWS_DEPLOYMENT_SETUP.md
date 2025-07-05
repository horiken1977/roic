# AWS Deployment Setup Guide

## Overview
This guide explains how to configure AWS deployment for the ROIC Analysis Application.

## GitHub Secrets Required

To enable AWS deployment, you need to configure the following secrets in your GitHub repository:

### Go to: Settings > Secrets and variables > Actions

### Required Secrets:

1. **AWS_ACCESS_KEY_ID**
   - Your AWS Access Key ID
   - Get this from AWS IAM User credentials

2. **AWS_SECRET_ACCESS_KEY**
   - Your AWS Secret Access Key
   - Get this from AWS IAM User credentials

### Optional Secrets:

3. **S3_BUCKET_NAME**
   - Custom S3 bucket name for deployment
   - If not provided, will use: `roic-app-{your-aws-account-id}`

4. **CLOUDFRONT_DISTRIBUTION_ID**
   - CloudFront distribution ID for CDN invalidation
   - Only needed if you want to use CloudFront

## AWS IAM Permissions Required

Your AWS IAM user needs the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:CreateBucket",
                "s3:ListBucket",
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:PutBucketWebsite",
                "s3:PutBucketPolicy",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::roic-app-*",
                "arn:aws:s3:::roic-app-*/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "sts:GetCallerIdentity"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "cloudfront:CreateInvalidation"
            ],
            "Resource": "*"
        }
    ]
}
```

## Setup Steps

1. **Create AWS IAM User:**
   - Go to AWS Console > IAM > Users
   - Create a new user for GitHub Actions
   - Attach the policy above

2. **Create Access Keys:**
   - Select the user > Security credentials
   - Create access key > Application running outside AWS
   - Save the Access Key ID and Secret Access Key

3. **Configure GitHub Secrets:**
   - Go to your GitHub repository
   - Settings > Secrets and variables > Actions
   - Add the required secrets

4. **Test Deployment:**
   - Push to main branch
   - Check Actions tab for deployment status

## Deployment URLs

After successful deployment:
- **GitHub Pages**: https://horiken1977.github.io/roic/
- **AWS S3**: Check deployment logs for the S3 website URL

## Troubleshooting

- **403 Errors**: Check IAM permissions
- **Bucket Creation Failed**: Ensure bucket name is unique globally
- **Deployment Timeout**: Check AWS credentials and permissions

## Security Best Practices

1. Use IAM roles instead of access keys when possible
2. Limit IAM permissions to minimum required
3. Rotate access keys regularly
4. Monitor AWS CloudTrail for deployment activities