const cron = require('node-cron');
const cheerio = require('cheerio');
const axios = require('axios').default;
require('dotenv').config()
const mongoose = require('mongoose');

mongoose.connect(process.env.DB_URI, {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;

db.once('open', () => {
    console.log('INFO : database connection stablished')
})


const notice = require('./model')



const Domain = 'https://soa.ac.in'
//const Domain = 'http://localhost'

const getNotices = () => {
    return new Promise((resolveNotice, refuseNotice) => {

        axios.get(Domain+'/iter')
        .then(res => {
            const $ = cheerio.load(res.data);
            let notices=[]
            Promise.all(
                $('a').filter((i, content) => {
                    return content.attribs.class == 'summary-title-link'
                }).each((i, content) => { 
                    new Promise((resolve, refuse) => {
                        notices.push({
                            'url': Domain+content.attribs.href,
                            'title': content.children[0].data
                        })
                        //console.log(content.attribs.href)
                        //console.log(content.children[0].data)
                        resolve()
                    })
                })
            ).then(() => {
                resolveNotice(notices)
            })
        })
    })
}

//performs query every 30min
cron.schedule('*/30 * * * * *', () => {
    console.log('check')
    getNotices().then(notices => {
        notices.forEach(item => {
            notice.findOne({
                url: item.url
            }).then(noticeElement => {
                if(noticeElement==null) {
                    let newNoticeElement = new notice
                    newNoticeElement.url = item.url
                    newNoticeElement.title = item.title
                    newNoticeElement.date = new Date
                    newNoticeElement.save().then((doc) => {
                        sendNotification(doc).then(() => {
                            console.log('new notice added at', new Date())
                        })
                    })
                }
            })
        })
    })
})


const sendNotification = (doc) => {
    return new Promise((resolve, refuse) => {
        console.log('new notification!!')
        //write the code for sending notification

        axios.post('https://onesignal.com/api/v1/notifications',
            {
                app_id: process.env.APP_ID,
                included_segments: ["TEST"],
                headings: {
                    en: "A New Notice on the Website"
                },
                contents: {
                    en: doc.title+' released on '+doc.date.toLocaleString('en-US', {timeZome: 'Asia/Calcutta'})
                },
                app_url: doc.url
            },
            {
                withCredentials: true,
                headers: {
                    Authorization: process.env.AUTH_KEY
                }
            }
        )
        .then(() => resolve())
    })
}