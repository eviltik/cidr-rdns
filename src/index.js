const pkg = require('../package.json');
const path = require('path');
const debug = require('debug')(`${pkg.name}:${path.basename(__filename)}`);

const EventEmitter = require('events');
const Netmask = require('netmask').Netmask;
const ipInt = require('ip-to-int');
const async = require('async');
const Dns2 = require('dns2');
const dns = require('dns');
const util = require('util');

const DEFAULT_CONCURRENCY = 10;
const DEFAULT_TIMEOUT = 3000;


/*
https://stackoverflow.com/questions/10777657/node-js-dns-lookup-how-to-set-timeout

example: RES_OPTIONS='ndots:3 retrans:1000 retry:3 rotate' node server.js

ndots: same as ARES_OPT_NDOTS
retrans: same as ARES_OPT_TIMEOUTMS
retry: same as ARES_OPT_TRIES
rotate: same as ARES_OPT_ROTATE
*/

function CidrRdns(opts) {
    opts = opts || {};
    opts.concurrency = opts.concurrency || DEFAULT_CONCURRENCY;
    opts.timeout = opts.timeout || DEFAULT_TIMEOUT;
    debug(opts);

    const resolveTimeout = async.timeout(resolve, opts.timeout);

    let dns2;
    let block;
    let currentint;
    let queue;

    function onQueueDrain() {
        debug('onQueueDrain');
    }

    function onQueueUnsaturated() {
        debug('onQueueUnsaturated');
        populateQueue();
    }

    function initQueue() {
        debug('initQueue');
        queue = async.queue(resolveTimeout, opts.concurrency);
        queue.drain(onQueueDrain);
        queue.unsaturated(onQueueUnsaturated);
    }

    function onResolveFailed(err, item) {
        debug('onResolveFailed', item, err);
    }

    function onResolveSuccess(item, response) {
        debug('onResolveSuccess', item, response);
    }

    function resolve(item, next) {
        item.ip = ipInt(item.ipint).toIP();
        debug('resolve', JSON.stringify(item));
        console.log(dns2);
        dns2.resolvePTR('12.124.105.46.in-addr.arpa')
            .then((response) => {
                onResolveSuccess(item, response);
                next();
            })
            .catch((err) => {
                onResolveFailed(err, item);
                next();
            });
    }

    function initDnsClient() {
        debug('initDnsClient');

        if (typeof opts.server === 'string') {
            opts.server = [ opts.server ];
        }

        if (!opts.server) {
            opts.server = dns.getServers();
        }

        const dnsClientOpts = {
            nameServers:opts.server,
            port:opts.port||53
        };

        console.log(dnsClientOpts);

        dns2 = new Dns2(dnsClientOpts);
    }

    async function start(cidr) {
        debug('start', cidr);
        block = new Netmask(cidr);
        delete block.bitmask;
        delete block.maskLong;
        delete block.netLong;
        delete block.base;
        delete block.mask;
        delete block.hostmask;
        delete block.broadcast;
        block.firstint = ipInt(block.first).toInt();
        block.lastint = ipInt(block.last).toInt();
        debug('start, firstint %s, lastint %s, count %s', block.firstint, block.lastint, block.size);
        initDnsClient();
        initQueue();
        populateQueue();
    }

    function populateQueue() {
        debug('populateQueue', JSON.stringify(block));

        let start;
        let last;

        if (!currentint) {
            start = block.firstint;
            last = start+opts.concurrency;
        } else {
            start = currentint+1;
            last = start+(opts.concurrency-queue.running());
        }

        if (last > block.lastint) last = block.lastint;

        let j = 0;
        //console.log('start', start, 'last', last);
        for (currentint = start; currentint <= last; currentint++) {
            j+=1;
            //console.log('adding %s to the queue (%s)', currentint, j);
            queue.push({
                count:j,
                ipint:currentint
            });
        }

    }

    this.start = start;
}


util.inherits(CidrRdns, EventEmitter);

module.exports = CidrRdns;

