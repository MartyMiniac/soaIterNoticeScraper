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

const getNotices = async () => {
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
cron.schedule('0 */30 * * * *', () => {
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
                    newNoticeElement.save().then(() => {
                        console.log('new notice added at', new Date())
                    })
                }
            })
        })
    })
})
