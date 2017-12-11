const Transport = require('./Transport.js');
const Dweb = require('./Dweb.js');
const nodefetch = require('node-fetch-npm');
const Url = require('url');
var fetch,Headers,Request;
if (typeof(Window) === "undefined") {
    //var fetch = require('whatwg-fetch').fetch; //Not as good as node-fetch-npm, but might be the polyfill needed for browser.safari
    //XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;  // Note this doesnt work if set to a var or const, needed by whatwg-fetch
    console.log("Node loaded");
    fetch = nodefetch;
    Headers = fetch.Headers;      // A class
    Request = fetch.Request;      // A class
} else {
    // If on a browser, need to find fetch,Headers,Request in window
    console.log("Loading browser version of fetch,Headers,Request");
    fetch = window.fetch;
    Headers = window.Headers;
    Request = window.Request;
}
//TODO-HTTP to work on Safari or mobile will require a polyfill, see https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch for comment

defaulthttpoptions = {
    urlbase: 'https://gateway.dweb.me:443'
};

class TransportHTTP extends Transport {

    constructor(options, verbose) {
        super(options, verbose);
        this.options = options;
        this.urlbase = options.http.urlbase;
        this.supportURLs = ['http','https'];
        this.supportFunctions = ['fetch', 'store', 'add', 'list', 'reverse']; //Does not support: listmonitor - reverse is disabled somewhere not sure if here or caller
        this.name = "HTTP";             // For console log etc
        this.status = Dweb.Transport.STATUS_LOADED;
    }

    static setup0(options, verbose) {
        let combinedoptions = Transport.mergeoptions({ http: defaulthttpoptions },options);
        try {
            let t = new TransportHTTP(combinedoptions, verbose);
            Dweb.Transports.addtransport(t);
            return t;
        } catch (err) {
            console.log("Exception thrown in TransportHTTP.p_setup", err.message);
            throw err;
        }
    }
    async p_setup1(verbose) {
        return this;
    }
    static async p_setup(options, verbose) {
        /*
        Setup the resource and open any P2P connections etc required to be done just once.

        :param boolean verbose: True for debugging output
        :param options: Options to override defaulthttpoptions of form  {http: {urlbase: "http://localhost:4244"}};
        :resolve Transport: Instance of subclass of Transport
         */
        return await TransportHTTP.setup0(options, verbose) // Sync version that doesnt connect
            .p_setup1(verbose);     // And connect
    }

    async p_status() {    //TODO-BACKPORT
        /*
        Return a string for the status of a transport. No particular format, but keep it short as it will probably be in a small area of the screen.
        resolves to: String representing type connected (always HTTP) and online if online.
         */
        try {
            this.info = await this.p_info();
            this.status = Dweb.Transport.STATUS_CONNECTED;
        } catch(err) {
            console.log("Error in p_status.info",err.message);
            this.status = Dweb.Transport.STATUS_FAILED;
        }
        return this.status;
    }

    async p_httpfetch(command, url, init, verbose) { // Embrace and extend "fetch" to check result etc.
        /*
        Fetch a url based from default server at command/multihash

        url: optional - contains multihash as last component (Maybe TODO handle already parsed URL if provided).
        resolves to: data as text or json depending on Content-Type header
        throws: TransportError if fails to fetch
         */
        //TODO-HTTP could check that rest of URL conforms to expectations.
        let httpurl = `${this.urlbase}/${command}`;
        try {
            if (url) {
                let parsedurl = Url.parse(url);
                let multihash = parsedurl.pathname.split('/').slice(-1);
                if (multihash) httpurl += "/" + multihash;
            }
            if (verbose) console.log(command, "httpurl=%s init=%o", httpurl, init);
            //console.log('CTX=',init["headers"].get('Content-Type'))
            // Using window.fetch, because it doesn't appear to be in scope otherwise in the browser.
            let response = await fetch(new Request(httpurl, init));
            // fetch throws (on Chrome, untested on Ffox or Node) TypeError: Failed to fetch)
            if (response.ok) {
                if (response.headers.get('Content-Type') === "application/json") {
                    return response.json(); // promise resolving to JSON
                } else {
                    return response.text(); // promise resolving to text
                }
            }   // TODO-HTTP may need to handle binary as a buffer instead of text
            // noinspection ExceptionCaughtLocallyJS
            throw new Dweb.errors.TransportError(`Transport Error ${response.status}: ${response.statusText}`);
        } catch (err) {
            // Error here is particularly unhelpful - if rejected during the COrs process it throws a TypeError
            console.log("Note error from fetch might be misleading especially TypeError can be Cors issue:",httpurl);
            if (err instanceof Dweb.errors.TransportError) {
                throw err;
            } else {
                throw new Dweb.errors.TransportError(`Transport error thrown by ${httpurl}: ${err.message}`);
            }
        }
    }

    p_get(command, url, verbose) {
        // Locate and return a block, based on its url
        // Throws TransportError if fails
        let init = {    //https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
            method: 'GET',
            headers: new Headers(),
            mode: 'cors',
            cache: 'default',
            redirect: 'follow',  // Chrome defaults to manual
        };
        return this.p_httpfetch(command, url, init, verbose);
    }

    p_post(command, url, type, data, verbose) {
        // Locate and return a block, based on its url
        // Throws TransportError if fails
        //let headers = new window.Headers();
        //headers.set('content-type',type); Doesn't work, it ignores it
        let init = {
            //https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
            //https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_header_name for headers tat cant be set
            method: 'POST',
            headers: {}, //headers,
            //body: new Buffer(data),
            body: data,
            mode: 'cors',
            cache: 'default',
            redirect: 'follow',  // Chrome defaults to manual
        };
        return this.p_httpfetch(command, url, init, verbose);
    }

    p_rawfetch(url, verbose) {
        /*
        Fetch from underlying transport,
        url: Of resource - which is turned into the HTTP url in p_httpfetch
        throws: TransportError if fails
         */
        //if (!(url && url.includes(':') ))
        //    throw new Dweb.errors.CodingError("TransportHTTP.p_rawfetch bad url: "+url);
        console.assert(url, "TransportHTTP.p_rawlist: requires url");
        return this.p_get("content/rawfetch", url, verbose)
    }

    p_rawlist(url, verbose) {
        // obj being loaded
        // Locate and return a block, based on its url
        console.assert(url, "TransportHTTP.p_rawlist: requires url");
        return this.p_get("metadata/rawlist", url, verbose);
    }
    rawreverse() { throw new Dweb.errors.ToBeImplementedError("Undefined function TransportHTTP.rawreverse"); }

    p_rawstore(data, verbose) {
        /*
        Store data on http server,
        data:   string
        returns {string}: url
        throws: TransportError on failure in p_post > p_httpfetch
         */
        //PY: res = self._sendGetPost(True, "rawstore", headers={"Content-Type": "application/octet-stream"}, urlargs=[], data=data, verbose=verbose)
        console.assert(data, "TransportHttp.p_rawstore: requires data");
        return this.p_post("contenturl/rawstore", null, "application/octet-stream", data, verbose); // resolves to URL
    }

    p_rawadd(url, sig, verbose) { //TODO-BACKPORT turn date into ISO before adding
        //verbose=true;
        if (!url || !sig) throw new Dweb.errors.CodingError("TransportHTTP.p_rawadd: invalid parms",url, sig);
        if (verbose) console.log("rawadd", url, sig);
        let value = JSON.stringify(sig.preflight(Object.assign({},sig)))+"\n"
        return this.p_post("void/rawadd", url, "application/json", value, verbose); // Returns immediately
    }

    static async test() {
        return this;  // I think this should be a noop - fetched already
    }

    p_info() { return this.p_get("info"); } //TODO-BACKPORT

}
exports = module.exports = TransportHTTP;

