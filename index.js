process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];

const parse = require('csv-parse/lib/sync');
const aws = require('aws-sdk');
const s3 = new aws.S3({ apiVersion: '2006-03-01' });
const api = require('./shopify');

var that = {
    getCustomer: function (obj) {
        return {
            first_name: obj.FIRST_NAME,
            last_name: obj.LAST_NAME,
            email: obj.EMAIL,
            accepts_marketing: obj["OPTED OUT"] === "F",
            verified_email: false,
            tax_exempt: false,
            addresses: [{
                address1: '',
                address2: '',
                city: obj.HOUSE_CITY,
                province: '',
                zip: obj.HOUSE_ZIP_CODE,
                phone: '',
                province_code: obj.HOUSE_STATE,
                country_code: 'US',
                country_name: 'United States',
                default: true
            }]
        };
    },
    processInventory: function (records) {
        records.forEach(function (record) {
        });
    },
    processCustomers: function (records) {
        records.forEach(function (record) {
            api.shopify.customers.create(that.getCustomer(record))
                .then(result => console.log(result))
                .catch(err => console.log(err));
        });
        
    },
    processCsv: function (csvBody, forceUpperCase) {
        var formattedBody = forceUpperCase ? csvBody.toUpperCase() : csvBody,
            records = parse(formattedBody, {
                columns: true,
                delimiter: ',',
            });

        if (process.env['IS_INVENTORY'] === "T")
            that.processInventory(records);
        else
            that.processCustomers(records);
    }
};

exports.handler = (event, context, callback) => {
    // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const params = {
        Bucket: bucket,
        Key: key,
    };

    s3.getObject(params, (err, data) => {
        if (err) {
            console.log(err);
            const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
            console.log(message);
            callback(message);
        } else {
            console.log('CONTENT TYPE:', data.ContentType);
            console.log('Filename:', key);
            console.log('SAMPLETEST:', process.env.SAMPLETEST);
            console.log('Body:', data.Body.toString());
            that.processCsv(data.Body.toString());

            callback(null, data.ContentType);
        }
    });

};

exports.processCsv = function (fileBody) {
    that.processCsv(fileBody);
};
