
require('babel-core/register')({ presets: ['es2015', 'react']}); // ES6 JS below!

// https://ponyfoo.com/articles/universal-react-babel

import React from 'react';
import Util from './Util';
import Search from './Search';
import Home from './Home';
import Details from './Details';


export default class Nav extends React.Component {
  constructor(htm) {
    super();
    this.mts = ['web', 'texts', 'movies', 'audio', 'software', 'image'];
    this.htm = htm; //ARCHIVE-BROWSER could be string or nodes (not sure what class that is, but whatever the JSX compiler gives
  }

  render(onbrowser) {
      if (typeof this.htm === "string") {
          this.htm = ( <div dangerouslySetInnerHTML={{__html: this.htm}}></div> );
      }
      // TODO-DETAILS removed this from search button as generates error - come back and fix
      //onClick="$(this).parents('#nav-search').find('form').submit(); return false"
      //TODO-DETAILS is putting the description (in 'htm' in as raw html which would be a nasty security hole since that comes from user !
      //TODO-DETAILS check links to search.php, intersept somehow on browser
      //TODO-DETAILS need to intercept links to /detail /search etc to nav functions
      return (
      <div id="wrap">
        <div id="navwrap1">
          <div id="navwrap2">
            <div className="navbar navbar-inverse navbar-static-top" role="navigation">
              <div id="nav-tophat-helper" className="hidden-xs"></div>
              <ul className="nav navbar-nav">

                {this.mts.map(function(mt, n){
                   return (
                     <li key={'mikey'+n} className="dropdown dropdown-ia pull-left">
                        { onbrowser ? (
                       <a title={mt} className={'navia-link '+mt}
                          onClick={() => Nav.nav_details(mt)}
                          data-top-kind={mt} data-toggle="tooltip" target="_top" data-placement="bottom">
                         <span className={'iconochive-'+mt} aria-hidden="true"></span>
                         <span className="sr-only">{mt}</span>
                       </a>
                ) : (
                        <a title={mt} className={'navia-link '+mt}
                            href={'/details/'+mt}
                            data-top-kind={mt} data-toggle="tooltip" target="_top" data-placement="bottom">
                                <span className={'iconochive-'+mt} aria-hidden="true"></span>
                                <span className="sr-only">{mt}</span>
                                </a>
                )}
                     </li>);
                 })}

                <li className="navbar-brand-li">
                  <a className="navbar-brand" href="/" target="_top">
                    <span className="iconochive-logo"  aria-hidden="true"></span>
                    <span className="sr-only">logo</span>
                  </a>
                </li>

                <li id="nav-search" className="dropdown dropdown-ia pull-right">
                  <a href="/search.php">
                    <span className="iconochive-search" aria-hidden="true"></span>
                    <span className="sr-only">search</span>
                  </a>
                  <div>
                    <form role="search" action="/search.php" target="_top">
                      <label htmlFor="search-bar-2" className="sr-only">Search the Archive</label>
                      <input id="search-bar-2" placeholder="Search" type="text" name="query" value=""/>
                      <input type="submit" value="Search"/>
                    </form>
                  </div>
                </li>

                <li className="dropdown dropdown-ia pull-right">
                  <a id="glyphme" href="https://archive.org/donate" _target="top"
                     data-toggle="tooltip" data-placement="bottom" title="Donate">
                    <img src="//archive.org/images/gift.png"/>
                  </a>
                </li>

                <li className="dropdown dropdown-ia pull-right">
                  <a href="https://archive.org/create" _target="top" data-toggle="tooltip" data-placement="bottom" title="Upload">
                    <span className="iconochive-upload"  aria-hidden="true"></span>
                    <span className="sr-only">upload</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="container container-ia">
          {this.htm}
        </div>
      </div>
    );
  }

  static nav_home() {
        console.log("Navigating to Home");
        return new Home(document.getElementById('main'), "");
  }

  static nav_details(id) {
    console.log("Navigating to Details",id);
    new Details(document.getElementById('main'), "", id); // Gets back a react tree
    return false; // Dont follow anchor link - unfortunately React ignores this
  }

  static nav_search(q) {
        console.log("Navigating to Search");
        new Search(document.getElementById('main'), htm, {query:q})
  }
    static AJS_on_dom_loaded() {
        /*
        This function is copied from archive.min.js because
        a) its run there on DOMLoaded, which is before we've got anything on the page
        b) Its anonymous in archive.min.js so can't call it
         */
        // Use this global hack, by adding class 'accessible-link' to any mouse-only element div/img
        AJS.makeMouseElementAccessible('.accessible-link')


        AJS.setUpActionTracking() // Must be before other form submit handlers are assigned
        AJS.setupPopupLink()
        AJS.nav_tophat_setup()
        AJS.nav_tophat_wb_setup()
        AJS.setUpCreativeCommonsLicenseLink()
        AJS.setUpSearchForms()

        /* global  archive_setup */
        if (typeof archive_setup !== 'undefined') {
            // when DOM loaded/stable, do some setup
            $(() => {
                for (const fn of archive_setup)
                    fn()
            })
        }

        AJS.footer();
    }

}
