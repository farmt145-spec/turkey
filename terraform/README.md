# 🏗️ Infrastructure as Code - Terraform Deployment

## Overview

This directory contains Terraform configurations to automatically deploy the Bloody Turkey application to:
- **Railway** - Backend API + MySQL Database
- **Netlify** - Frontend + Netlify Functions

---

## Prerequisites

1. **Terraform** (v1.0+)
   ```bash
   # macOS
   brew install terraform
   
   # Ubuntu/Debian
   sudo apt-get install terraform
   
   # Or download: https://www.terraform.io/downloads
   ```

2. **Railway Account**
   - Sign up: https://railway.app
   - Get API Token: https://railway.app/account/tokens
   - Save for later: `TF_VAR_railway_api_token`

3. **Netlify Account**
   - Sign up: https://netlify.com
   - Get API Token: https://app.netlify.com/user/applications/personal
   - Find Account Slug: https://app.netlify.com/account
   - Save: `TF_VAR_netlify_api_token` and `TF_VAR_netlify_account_slug`

4. **GitHub Repository**
   - Repository: `farmt145-spec/turkey`
   - Public access required for Netlify

---

## Files

- **`railway.tf`** - Railway infrastructure (MySQL + Node.js service)
- **`netlify.tf`** - Netlify site configuration
- **`variables.tf`** - Railway variables
- **`netlify-variables.tf`** - Netlify variables
- **`terraform.tfvars.example`** - Example variables file
- **`main.tf`** - Main configuration (if needed)

---

## Quick Start (5 minutes)

### Step 1: Set Environment Variables

```bash
# Railway API Token
export TF_VAR_railway_api_token="your_railway_token_here"

# Netlify API Token
export TF_VAR_netlify_api_token="your_netlify_token_here"

# Your Netlify account slug (from account settings)
export TF_VAR_netlify_account_slug="your-netlify-account"
```

### Step 2: Copy and Edit Variables File

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars

# Edit terraform.tfvars with your values:
# - netlify_account_slug
# - Any other custom settings
```

### Step 3: Initialize Terraform

```bash
cd terraform
terraform init
```

### Step 4: Plan Deployment

```bash
terraform plan -out=tfplan
```

Review the output to see what will be created.

### Step 5: Apply Configuration

```bash
terraform apply tfplan
```

This will:
1. ✅ Create Railway project
2. ✅ Create MySQL database with random password
3. ✅ Create Node.js service pointing to GitHub repo
4. ✅ Create Netlify site connected to GitHub
5. ✅ Configure all environment variables
6. ✅ Generate secure secrets automatically
7. ✅ Trigger first deployment

### Step 6: Monitor Deployment

After applying:

1. **Railway Dashboard**: https://railway.app/dashboard
   - Check MySQL status (should be "Running")
   - Check App service (should be building)

2. **Netlify Dashboard**: https://app.netlify.com
   - Go to your site
   - Check Deployments tab
   - Build should start automatically

3. **Application**
   - Should be live within 2-3 minutes
   - URL will be shown in Terraform output

---

## Outputs

After successful deployment, Terraform will display:

```
project_id = "railway-project-id"
mysql_connection_string = "mysql://user:pass@host:3306/db"
site_id = "netlify-site-id"
site_name = "turkey-production"
site_url = "https://turkey-production.netlify.app"
```

**Save these values!**

---

## Environment Variables Automatically Set

Terraform automatically configures these in both Railway and Netlify:

```
DATABASE_TYPE = mysql
DATABASE_URL = [from Railway]
NODE_ENV = production
SESSION_SECRET = [auto-generated]
API_KEY_PEPPER = [auto-generated]
DEMO_MODE = true
DEMO_COMPANY_ID = 1
VITE_DEMO_MODE = true
```

---

## Common Commands

```bash
# Show current state
terraform show

# Check what will change
terraform plan

# Apply changes
terraform apply

# Destroy infrastructure (caution!)
terraform destroy

# Show specific output
terraform output site_url
terraform output mysql_connection_string

# Validate configuration
terraform validate

# Format configuration
terraform fmt
```

---

## Troubleshooting

### "API token invalid"
- Check token in Railway/Netlify dashboard
- Token might be expired
- Generate new token and retry

### "Repository not found"
- Ensure repository is public
- Check GitHub username/repo spelling
- Repository: `farmt145-spec/turkey`

### "Netlify deployment failed"
- Check build logs in Netlify dashboard
- Verify DATABASE_URL is correct
- Check that all env variables are set

### "MySQL won't start"
- Wait 2-3 minutes for Railway to provision
- Check Railway dashboard for service status
- May need to restart service manually

---

## Updating Configuration

To update any settings:

1. Edit `terraform.tfvars`
2. Run `terraform plan` to review changes
3. Run `terraform apply` to update

---

## Destroying Infrastructure

⚠️ **Warning**: This will delete everything!

```bash
cd terraform
terraform destroy
```

Will remove:
- Railway project and MySQL database
- Netlify site
- All deployments and data

**Make backups before destroying!**

---

## Advanced: Using Terraform Cloud

For team collaboration and state management:

1. Create Terraform Cloud account: https://app.terraform.io
2. Create organization and workspace
3. Add to `terraform` block:

```hcl
cloud {
  organization = "your-org"
  workspaces {
    name = "turkey-production"
  }
}
```

4. Authenticate:
```bash
terraform login
# Paste token when prompted
```

---

## Security Best Practices

1. **Never commit secrets**
   - `.tfstate` files contain sensitive data
   - Add to `.gitignore`: `terraform/terraform.tfstate*`

2. **Use Terraform Cloud for secrets**
   - Store tokens in Terraform Cloud UI
   - Share safely with team

3. **Rotate secrets regularly**
   - Change DATABASE passwords
   - Regenerate SESSION_SECRET and API_KEY_PEPPER

4. **Enable audit logging**
   - Railway: Check deployment history
   - Netlify: Enable audit logs for team

---

## Resources

- 📖 [Terraform Docs](https://www.terraform.io/docs)
- 🚂 [Railway Provider](https://github.com/railwayapp/terraform-provider-railway)
- 🌐 [Netlify Provider](https://registry.terraform.io/providers/netlify/netlify/latest)
- 📚 [Terraform Best Practices](https://www.terraform.io/cloud-docs/guides/recommended-practices)

---

**Infrastructure as Code makes deployment repeatable, auditable, and safe!** 🎯
