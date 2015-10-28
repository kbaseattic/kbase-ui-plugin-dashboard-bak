/*global
 define
 */
/*jslint
 white: true
 browser: true
 */

define([
    'kb_dashboard_widget_base', 
    'kb_service_api', 
    'bluebird'],
   function (DashboardWidget, ServiceApi, Promise) {
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
               if (this.runtime.service('session').isLoggedIn()) {
                  this.serviceApi = ServiceApi.make({runtime: this.runtime});
               } else {
                  this.userProfileClient = null;
               }
            }
         },
       
         setInitialState: {
            value: function () {
               return new Promise(function (resolve, reject) {
                  if (!this.runtime.getService('session').isLoggedIn()) {
                     resolve();
                  } else {
                    this.serviceApi.getCollaborators()
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