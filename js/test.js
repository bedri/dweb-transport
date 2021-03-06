// Fake a browser like environment for some tests
const jsdom = require("jsdom");
const { JSDOM } = jsdom;        //TODO - figure out what this does, dont understand the Javascript
htmlfake = '<!DOCTYPE html><ul><li id="myList.0">Failed to load sb via StructuredBlock</li><li id="myList.1">Failed to load mb via MutableBlock</li><li id="myList.2">Failed to load sb via dwebfile</li><li id="myList.3">Failed to load mb via dwebfile</li></ul>';
const dom = new JSDOM(htmlfake);
document = dom.window.document;   // Note in JS can't see "document" like can in python

const Dweb = require('./Dweb');

/*
    This file is intended to be run under node, e.g. "node test.js" to test as many features as possible.
 */


// Utility packages (ours) Aand one-liners
//UNUSED: const makepromises = require('./utils/makepromises');
function delay(ms, val) { return new Promise(resolve => {setTimeout(() => { resolve(val); },ms)})}


require('y-leveldb')(Dweb.TransportYJS.Y); //- can't be there for browser, node seems to find it ok without this, though not sure why, though its the cause of the warning: YJS: Please do not depend on automatic requiring of modules anymore! Extend modules as follows `require('y-modulename')(Y)`
let verbose = false;
let acl;
    // Note that this test setup is being mirror in test_ipfs.html
    // In general it should be possible to comment out failing tests EXCEPT where they provide a value to the next */

async function p_test(verbose) {
    try {
        //Comment out one of these next two lines
        //let transportclass = Dweb.TransportIPFS;
        let opts = {
            http: {urlbase: "http://localhost:4244"},   // Localhost - comment out if want to use gateway.dweb.me (default args use this)
            yarray: {db: {name: "leveldb", dir: "../dbtestjs", cleanStart: true, connector: {}}},  // Cleanstart clears db
        }; // Note browser requires indexeddb
        // Note the order of these is significant, it will retrieve by preference from the first setup, try with both orders if in doubt.
        //let t_http = await Dweb.TransportHTTP.p_setup(opts, verbose);
        let t_ipfs = await Dweb.TransportIPFS.p_setup(opts, verbose); // Note browser requires indexeddb
        let t_yjs = await Dweb.TransportYJS.p_setup(opts, verbose); // Should find ipfs transport
        if (verbose) console.log("setup returned and transport set");
        // Need to ask status before using as wont update status till then which means wont be used
        //await t_http.p_status();
        await t_ipfs.p_status();
        await t_yjs.p_status();

        //await Dweb.TransportHTTP.test(t_http, verbose);
        await Dweb.TransportIPFS.test(t_ipfs, verbose);
        await Dweb.TransportYJS.test(t_yjs, verbose);
        if (verbose) console.log("Transports tested");
        await Dweb.Block.p_test(verbose);
        await Dweb.Signature.p_test(verbose);
        await Dweb.KeyPair.test(verbose);
        let res = await Dweb.AccessControlList.p_test(verbose);
        acl = res.acl;
        await Dweb.VersionList.test(verbose);
        await Dweb.KeyChain.p_test(acl, verbose); // depends on VersionList for test, though not for KeyChain itself
        console.log("------END OF PREVIOUS TESTING PAUSING=====");
        await delay(1000);
        console.log("------AWAITED ANY BACKGROUND OUTPUT STARTING NEXT TEST =====");
        console.log("------END OF NEW TESTING PAUSING=====");
        await delay(1000);
        console.log("------AND FINISHED WAITING =====")
        //let sb = (await Dweb.StructuredBlock.test(document, verbose)).sb;
        console.log("Completed test - running IPFS in background, hit Ctrl-C to exit");
    } catch (err) {
        console.log("Test failed", err);
    }


}
p_test(verbose);
/* path tests not done ... old ones
 console.log("Now test path using dwebfile and sb =======");
 verbose=false;
 Dweb.p_dwebfile("sb", sburl, "langs/readme.md", ["p_elem", "myList.2", verbose, null]);
 console.log("Now test path using dwebfile and mb =======");
 Dweb.p_dwebfile("mb", mburl, "langs/readme.md", ["p_elem", "myList.3", verbose, null]);
 console.log("END testing previouslyworking()");

 */

