terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # --- REMOTE STATE BACKEND ---
  backend "s3" {
    bucket = "kashan-stagingtfstate-storage-2026"
    key    = "staging/terraform.tfstate" # Path inside the S3 bucket
    region = "us-east-1"
  }
} # <--- THIS CLOSING BRACE WAS MISSING HERE!

provider "aws" {
  region = "us-east-1"
}

module "staging_infra" {
  source        = "../../modules/app_stack"
  
  environment   = "staging"
  instance_type = "t3.micro"       # Small instance for staging
  ami_id        = "ami-0b6d9d3d33ba97d99" # Replace with valid Ubuntu/Amazon Linux AMI in us-east-1
  key_name      = "keyforec2"
  backend_domain_name = "stage-api.daftarpro.com"
}

output "staging_ec2_ip" {
  value = module.staging_infra.ec2_public_ip
}

output "staging_cloudfront_id" {
  value = module.staging_infra.cloudfront_distribution_id
}
output "staging_site_url" {
  value = "https://${module.staging_infra.cloudfront_domain_name}"
}
