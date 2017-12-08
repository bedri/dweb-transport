
require('babel-core/register')({ presets: ['es2015', 'react']}); // ES6 JS below!

import http from 'http';
import async from 'async';
import React from 'react';
//Not needed on client - kept so script can run in both cases
import ReactDOMServer from 'react-dom/server';
//Next line is for client, not needed on server but doesnt hurt
import ReactDOM from 'react-dom';

import Nav from './Nav';
import Util from './Util';
import Search from './Search';
import template_image from './template_image';


export default class Details {
  constructor(id, {}={}) {
      this.id = id;
  }
  async fetch() { // Note almost identical to code on Search.fetch()
      console.log('get metadata for '+this.id);
      // talk to Metadata API
          const _this = this;
          let response = await fetch(new Request(  // Note almost identical code on Details.js and Search.js
              'https://archive.org/metadata/'+this.id,
              {
                  method: 'GET',
                  headers: new Headers(),
                  mode: 'cors',
                  cache: 'default',
                  redirect: 'follow',  // Chrome defaults to manual
              }
          ));
          if (response.ok) {
              if (response.headers.get('Content-Type') === "application/json") {
                  this.item = await response.json(); // response.json is a promise resolving to JSON already parsed
              } else {
                  t = response.text(); // promise resolving to text
                  console.log("Expecting JSON but got",t);
              }
          }   // TODO-HTTP may need to handle binary as a buffer instead of text
          return this; // For chaining, but note will need to do an "await fetch"
  }
  async render(res, htm) {

    // If res is an HTMLElement we can reasonably assume we are on the browser, but HTMLElement not defined in node, so check if its a ServerResponse
    const onbrowser =  res.constructor.name !== "ServerResponse"; // For a browser we render to an element, for server feed to a response stream
      let item = this.item;
      if (verbose) console.log(`render mediatype = ${item.metadata.mediatype}`)
        if (!item.metadata){

          els = new Nav('item cannot be found or does not have metadata').render(onbrowser);
          if (onbrowser) {
              ReactDOM.render(els, res); // Client - put in node supplied
          } else {
              res.statusCode = 500;
              htm += ReactDOMServer.renderToStaticMarkup(els);
              res.end(htm);
          }
          return;
        }

        if (item.metadata.mediatype=='collection'){
          //TODO-DETAILS probably move this to the Search class after move to use the approach taken in template_image.js
          const creator = (item.metadata.creator  &&  (item.metadata.creator != item.metadata.title) ? item.metadata.creator : '');
          //ARCHIVE-BROWSER note the elements below were converted to HTML 3 times in original version
          const banner = (
            <div className="welcome container container-ia width-max" style={{'backgroundColor':'white'}}>
              <div className="container">
                <div className="row">
                  <div className="col-xs-11 col-sm-10 welcome-left">
                    <div id="file-dropper-wrap">
                      <div id="file-dropper"></div>
                      <img id="file-dropper-img" className="img-responsive" style={{'maxWidth':350, margin:'0 10px 5px 0'}} src={'https://archive.org/services/img/'+this.id}/>
                    </div>
                    <h1>{item.metadata.title}</h1>
                    <h4>{creator}</h4>
                    <div id="descript" style={{'maxHeight':43, cursor:'pointer'}}>
                      {item.metadata.description}
                    </div>
                  </div>
                  <div className="col-xs-1 col-sm-2 welcome-right">
                    xxx
                  </div>
                </div>
              </div>
            </div>
          );
          //ARCHIVE-BROWSER note htm is empty at this point on browser
          let s = await new Search({query:'collection:'+this.id, sort:'-downloads', banner:banner}).fetch();
            s.render(res, htm);
          return s;
        }

        var wrap =`<h1>${item.metadata.title}</h1>`;

        var avs=[];
        var cfg={};
        avs = item.files.filter(fi => (fi.format=='h.264' || fi.format=='512Kb MPEG4'));
        if (!avs.length)
          avs = item.files.filter(fi => fi.format=='VBR MP3');
        cfg.aspectratio = 4/3;

        if (avs.length){
          var playlist=[];

          // reduce array down to array of just filenames
          //avs = avs.map(val => val.name);

          avs.sort((a,b) => Util.natcompare(a.name, b.name));   //Unsure why sorting names, presumably tracks are named alphabetically ?

          for (var fi of avs)
            playlist.push({title:(fi.title ? fi.title : fi.name), sources:[{file:'//archive.org/download/'+this.id+'/'+fi.name}]});
          playlist[0].image = 'https://archive.org/services/img/'+this.id;

          if (!onbrowser) {
              playlist = JSON.stringify(playlist);
              cfg = JSON.stringify(cfg);
          }

          wrap += `<div id="jw6"></div>`;   //TODO-FETCH try building this as JSX for consistency.
          //ARCHIVE-BROWSER made urls absolute
            if (!onbrowser) { // onbrowser its statically included in the html and Play will be run later  //TODO-DETAILS-NODE move to seperate function?
                htm += `
          <script src="//archive.org/jw/6.8/jwplayer.js" type="text/javascript"></script>
          <script src="//archive.org/includes/play.js" type="text/javascript"></script>
          <script>
            $(function(){ Play('jw6', ${playlist}, ${cfg}); });
          </script>
          <style>
            #jw6, #jw6__list { backgroundColor:black; }
          </style>`;
            }
        }
        else if (item.metadata.mediatype=='texts'){
          wrap += `<iframe width="100%" height="480" src="https://archive.org/stream/${this.id}?ui=embed#mode/2up"></iframe><br/>`;
        }
        else if (item.metadata.mediatype === 'image') { //TODO-DETAILS this is the new approach to embedding a mediatype - to gradually replace inline way in this file.
            wrap = template_image(item);    // Apply the item to a template, returns a JSX tree suitable for wrapping in Nav
            archive_setup.push(function () {    //TODO-DETAILS check this isn't being left on archive_setup for next image etc
                AJS.theatresize();
                AJS.carouselsize('#ia-carousel', true);
            });
        } else {
            //TODO-DETAILS Note both node version and this version handle relative links embedded in the description to other resources badly, but shouldnt html in the description be considered dangerous anyway ?
            wrap += `${item.metadata.description}`; //TODO-DETAILS note this is set dangerously as innerHTML in Nav and since description comes from user could be really bad, should be turned into text node
        }
        let els = new Nav(wrap).render(onbrowser); // temp store for debugging
        if(onbrowser) {
            ReactDOM.render(els, res); // Client - put in node supplies
            Play('jw6', playlist, cfg);
            Nav.AJS_on_dom_loaded(); // Runs code pushed archive_setup - needed for image
        } else { // Presume its the HTMLResponse, could explicitly check class if new what it was?
          htm += ReactDOMServer.renderToStaticMarkup(els);
          //htm += ReactDOMServer.renderToStaticMarkup(React.createFactory(Nav)(wrap));
          res.end(htm);
        }
        return; // Note cant return the content here, as content loaded asynchronously
  }
}
