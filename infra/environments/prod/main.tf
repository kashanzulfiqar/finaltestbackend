terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # --- REMOTE STATE BACKEND ---
  backend "s3" {
    bucket = "kashan-prodtfstate-storage-2026"
    key    = "prod/terraform.tfstate"    # Distinct path for Prod
    region = "us-east-1"
  }
} # <--- ADDED THIS CLOSING BRACE

provider "aws" {
  region = "us-east-1"
}

module "prod_infra" {
  source        = "../../modules/app_stack"
  
  environment   = "prod"
  instance_type = "t3.micro"      # Larger instance for prod
  ami_id        = "ami-0b6d9d3d33ba97d99" # Replace with valid Ubuntu/Amazon Linux AMI in us-east-1
  key_name      = "keyforec2"
  backend_domain_name = "stage-api.daftarpro.com" 
}

output "prod_ec2_ip" {
  value = module.prod_infra.ec2_public_ip
}

output "prod_cloudfront_id" {
  value = module.prod_infra.cloudfront_distribution_id
}
output "prod_site_url" {
  value = "https://${module.prod_infra.cloudfront_domain_name}"
}
