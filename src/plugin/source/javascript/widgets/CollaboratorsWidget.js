/*global
 define
 */
/*jslint
 white: true
 browser: true
 */

define([
    'kb_widget_dashboard_base', 
    'kb.client.methods', 
    'kb.appstate', 
    'bluebird'],
   function (DashboardWidget, ClientMethods, AppState, Promise) {
      'use strict';
      var Widget = Object.create(DashboardWidget, {
         init: {
            value: function (cfg) {
               cfg.name = 'CollaboratorsWidget';
               cfg.title = 'Common Collaborator Network';
               this.DashboardWidget_init(cfg);

               return this;
            }
         },

         setup: {
            value: function () {
               // Set up workspace client
               if (AppState.getItem('session').isLoggedIn()) {
                  this.clientMethods = Object.create(ClientMethods).init();
               } else {
                  this.userProfileClient = null;
               }
            }
         },
       
         setInitialState: {
            value: function () {
               return new Promise(function (resolve, reject) {
                  if (!AppState.getItem('session').isLoggedIn()) {
                     resolve();
                  } else {
                    this.clientMethods.getCollaborators()
                    .then(function (collaborators) {
                       this.setState('collaborators', collaborators);
                       resolve();
                    }.bind(this))
                    .catch(function (err) {
                       reject(err);
                    });                     
                  }
               }.bind(this));
            }
         }
      });

      return Widget;
   });