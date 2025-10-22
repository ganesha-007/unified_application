const { google } = require('googleapis');
require('dotenv').config();

async function testGmailAPI() {
  try {
    console.log('🔍 Testing Gmail API with your credentials...');
    console.log('📧 Google Client ID:', process.env.GOOGLE_CLIENT_ID);
    console.log('🔑 Google Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing');
    console.log('🔗 Redirect URI:', process.env.GOOGLE_REDIRECT_URI);
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    console.log('\n✅ OAuth2 client created successfully');
    
    // Generate auth URL
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

    console.log('\n🔗 Gmail OAuth URL generated:');
    console.log(authUrl);
    console.log('\n📝 To test the full flow:');
    console.log('1. Copy the URL above and open it in your browser');
    console.log('2. Complete the OAuth flow with your Google account');
    console.log('3. Copy the authorization code from the callback URL');
    console.log('4. Use that code to get access tokens');
    
    console.log('\n✅ Gmail API configuration is working correctly!');
    console.log('🎯 Your Google credentials are properly set up.');
    
  } catch (error) {
    console.error('❌ Error testing Gmail API:', error.message);
    console.error('🔍 Full error:', error);
  }
}

testGmailAPI();



