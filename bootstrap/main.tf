terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# 1. Staging Terraform State Bucket
resource "aws_s3_bucket" "staging_state" {
  bucket        = "kashan-stagingtfstate-storage-2026"
  force_destroy = false
}

# Enable Versioning for Staging
resource "aws_s3_bucket_versioning" "staging_versioning" {
  bucket = aws_s3_bucket.staging_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# 2. Production Terraform State Bucket
resource "aws_s3_bucket" "prod_state" {
  bucket        = "kashan-prodtfstate-storage-2026"
  force_destroy = false
}

# Enable Versioning for Production
resource "aws_s3_bucket_versioning" "prod_versioning" {
  bucket = aws_s3_bucket.prod_state.id
  versioning_configuration {
    status = "Enabled"
  }
}
