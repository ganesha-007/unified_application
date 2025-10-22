const { google } = require('googleapis');
require('dotenv').config();

async function checkOAuthConsent() {
  try {
    console.log('🔍 Checking OAuth Consent Screen Configuration...');
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    console.log('\n📋 Required OAuth Consent Screen Settings:');
    console.log('1. ✅ App Name: "Unified Inbox" (or your app name)');
    console.log('2. ✅ User Support Email: Your email address');
    console.log('3. ✅ Developer Contact: Your email address');
    console.log('4. ✅ Scopes: Gmail API scopes should be added');
    console.log('5. ✅ Test Users: Add your email for testing');
    
    console.log('\n🔐 Required Gmail API Scopes:');
    console.log('- https://www.googleapis.com/auth/gmail.readonly');
    console.log('- https://www.googleapis.com/auth/gmail.send');
    console.log('- https://www.googleapis.com/auth/gmail.modify');
    
    console.log('\n📝 OAuth Consent Screen Checklist:');
    console.log('□ App Information filled out');
    console.log('□ Scopes added (Gmail API scopes)');
    console.log('□ Test users added (your email)');
    console.log('□ App verification status checked');
    
    console.log('\n🔗 To configure OAuth Consent Screen:');
    console.log('1. Go to: https://console.cloud.google.com/apis/credentials/consent');
    console.log('2. Select your project: "My First Project"');
    console.log('3. Configure the consent screen');
    console.log('4. Add Gmail API scopes');
    console.log('5. Add test users (your email)');
    
  } catch (error) {
    console.error('❌ Error checking OAuth consent:', error.message);
  }
}

checkOAuthConsent();



