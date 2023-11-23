const nodemailer = require('nodemailer')
const googleApis = require("googleapis")

const REDIRECT_URI =`https://developers.google.com/oauthplayground`;
const CLIENT_ID = `776189982270-9l681r564qbg3th757rgej5d3v4ntg3f.apps.googleusercontent.com`;
const CLIENT_SECRET = `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`;
const REFRESH_TOKEN = `1//04Gb7ssBFumJqCgYIARAAGAQSNwF-L9IrGMX30lgaoCuJQ-ZlAtr4vfC-3SzUZG6KtgUw7h4I1scbB8RNeMSQ1oXG2_8WgCwhNC8`;

const authClient = new googleApis.google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET,REDIRECT_URI);
authClient.setCredentials({refresh_token: REFRESH_TOKEN});

async function mailer(receiver,id,key){
    try{
        const ACCESS_TOKEN = await authClient.getAccessToken();
        const transport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user:"pvalmadir@gmail.com",
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: ACCESS_TOKEN
            }
        })
        const details = {
            from: "valmadir putin<pvalmadir@gmail.com>",
            to: receiver,
            subject: "about you",
            text:"kuch to kuch to",
            html: `hey you can recover your account by clicking on the following link <a href="http://localhost:3000/forgot/${id}/${key}">http://localhost:3000/forgot/${id}/${key}</a>`
        }
        const result = await transport.sendMail(details);
        return result;
        
    }
    catch(err){
        return err;
    }
}

module.exports = mailer