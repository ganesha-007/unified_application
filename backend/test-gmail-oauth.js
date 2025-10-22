const { google } = require('googleapis');
require('dotenv').config();

async function testGmailOAuth() {
  try {
    console.log('🧪 Testing Gmail OAuth Flow...');
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    console.log('\n🔗 Gmail OAuth URL:');
    console.log(authUrl);
    
    console.log('\n📝 Next Steps:');
    console.log('1. Copy the URL above');
    console.log('2. Open it in your browser');
    console.log('3. Sign in with your Gmail account');
    console.log('4. Grant permissions to your app');
    console.log('5. You\'ll be redirected to: http://localhost:3000/auth/gmail/callback?code=...');
    console.log('6. The backend will automatically retrieve your Gmail email ID');
    
    console.log('\n✅ If you see the OAuth consent screen, your configuration is working!');
    console.log('❌ If you get an error, check the OAuth consent screen configuration');
    
  } catch (error) {
    console.error('❌ Error testing Gmail OAuth:', error.message);
  }
}

testGmailOAuth();



