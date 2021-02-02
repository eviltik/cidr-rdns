const CidrLookup = require('../src/index.js');

const options = {
    server:'8.8.8.8',
    timeout:3000,
    concurrency:10
};

const cidrLookup = new CidrLookup(options);

//cidrLookup.start('104.20.23.46/32');
cidrLookup.start('46.105.124.12/32');

cidrLookup.on('hostname', onHostnameFound);
cidrLookup.on('finish', onFinish);

function onHostnameFound(data) {
    console.log('hoHostnameFound', data);
}

function onFinish(stats) {
    console.log('onFinish', stats);
}
