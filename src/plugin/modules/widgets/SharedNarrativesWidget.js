/*global
 define, require
 */
/*jslint
 browser: true,
 white: true
 */
define([
    'jquery', 
    'kb_dashboard_widget_base', 
    'kb_service_api', 
    'kb_widget_buttonBar', 
    'bluebird', 
    'bootstrap'
],
    function ($, DashboardWidget, ServiceApi, Buttonbar, Promise) {
        "use strict";
        var widget = Object.create(DashboardWidget, {
            init: {
                value: function (cfg) {
                    cfg.name = 'SharedNarrativesWidget';
                    cfg.title = 'Narratives Shared with You';
                    this.DashboardWidget_init(cfg);

                    // TODO: get this from somewhere, allow user to configure this.
                    this.params.limit = 10;

                    this.view = 'slider';
                    this.templates.env.addFilter('appName', function (x) {
                        return this.getState(['appsMap', x, 'name'], x);
                    }.bind(this));
                    this.templates.env.addFilter('methodName', function (x) {
                        return this.getState(['methodsMap', x, 'name'], x);
                    }.bind(this));
                    return this;
                }
            },
            setup: {
                value: function () {
                    this.kbservice = ServiceApi.make({runtime: this.runtime});
                }
            },
            getAppName: {
                value: function (name) {
                    return this.getState(['appsMap', name, 'name'], name);
                }
            },
            getMethodName: {
                value: function (name) {
                    return this.getState(['methodsMap', name, 'name'], name);
                }
            },
            setupUI: {
                value: function () {
                    if (this.hasState('narratives') && this.getState('narratives').length > 0) {
                        this.buttonbar = Object.create(Buttonbar).init({
                            container: this.container.find('[data-placeholder="buttonbar"]')
                        });
                        this.buttonbar
                            .clear()
                            .addInput({
                                placeholder: 'Search',
                                place: 'end',
                                onkeyup: function (e) {
                                    this.setParam('filter', $(e.target).val());
                                }.bind(this)
                            });
                    }
                }
            },
            render: {
                value: function () {
                    // Generate initial view based on the current state of this widget.
                    // Head off at the pass -- if not logged in, can't show profile.
                    if (this.error) {
                        this.renderError();
                    } else if (this.runtime.getService('session').isLoggedIn()) {
                        //if (this.initialStateSet) {
                        this.places.title.html(this.widgetTitle);
                        this.places.content.html(this.renderTemplate(this.view));
                        //}
                    } else {
                        //if (this.initialStateSet) {
                        // no profile, no basic aaccount info
                        this.places.title.html(this.widgetTitle);
                        this.places.content.html(this.renderTemplate('unauthorized'));
                        //}
                    }
                        this.container.find('[data-toggle="popover"]').popover();
                        this.container.find('[data-toggle="tooltip"]').tooltip();
                    return this;
                }
            },
            filterState: {
                value: function () {
                    var search = this.getParam('filter');
                    if (!search || search.length === 0) {
                        this.setState('narrativesFiltered', this.getState('narratives'));
                        return;
                    }
                    try {
                        var searchRe = new RegExp(search, 'i');
                    } catch (ex) {
                        // User entered invalid search expression. How to give the user feedback?
                    }
                    var nar = this.getState('narratives').filter(function (x) {
                        if (x.workspace.metadata.narrative_nice_name.match(searchRe) ||
                            (x.object.metadata.cellInfo &&
                                (function (apps) {
                                    for (var i in apps) {
                                        var app = apps[i];
                                        if (app.match(searchRe) || this.getAppName(app).match(searchRe)) {
                                            return true;
                                        }
                                    }
                                }.bind(this))(Object.keys(x.object.metadata.cellInfo.app))) ||
                            (x.object.metadata.cellInfo &&
                                (function (methods) {
                                    for (var i in methods) {
                                        var method = methods[i];
                                        if (method.match(searchRe) || this.getMethodName(method).match(searchRe)) {
                                            return true;
                                        }
                                    }
                                }.bind(this))(Object.keys(x.object.metadata.cellInfo.method))))
                        {
                            return true;
                        } else {
                            return false;
                        }
                    }.bind(this));
                    this.setState('narrativesFiltered', nar);
                }
            },
            onStateChange: {
                value: function () {
                    var count = this.doState('narratives', function (x) {
                        return x.length
                    }, null);
                    var filtered = this.doState('narrativesFiltered', function (x) {
                        return x.length
                    }, null);

                    this.viewState.setItem('sharedNarratives', {
                        count: count,
                        filtered: filtered
                    });
                }
            },
            setInitialState: {
                value: function (options) {
                    return new Promise(function (resolve, reject, notify) {
                        // Get all workspaces, filter out those owned by the user,
                        // and those that are public

                        Promise.all([this.kbservice.getNarratives({
                                params: {
                                    showDeleted: 0,
                                }
                            }),
                            this.kbservice.getApps(),
                            this.kbservice.getMethods()])
                            .then(function (result) {
                                var narratives = result[0];
                                var apps = result[1];
                                var methods = result[2];


                                this.setState('apps', apps);
                                var appsMap = {};
                                apps.forEach(function (app) {
                                    appsMap[app.id] = app;
                                });
                                this.setState('appsMap', appsMap);

                                this.setState('methods', methods);
                                var methodsMap = {};
                                methods.forEach(function (method) {
                                    methodsMap[method.id] = method;
                                });
                                this.setState('methodsMap', methodsMap);


                                if (narratives.length === 0) {
                                    this.setState('narratives', []);
                                    resolve();
                                    return;
                                }

                                // TODO: move this into getNarratives (the hook is there, just not implemented)
                                // filter out those owned, and those which we don't have
                                // view or write permission for
                                narratives = narratives.filter(function (x) {
                                    if (x.workspace.owner === this.runtime.getService('session').getUsername() ||
                                        x.workspace.user_permission === 'n') {
                                        return false;
                                    } else {
                                        return true;
                                    }
                                }.bind(this));

                                this.kbservice.getPermissions(narratives)
                                    .then(function (narratives) {
                                        narratives = narratives.sort(function (a, b) {
                                            return b.object.saveDate.getTime() - a.object.saveDate.getTime();
                                        });
                                        this.setState('narratives', narratives);
                                        this.filterState();

                                        resolve();
                                    }.bind(this))
                                    .catch(function (err) {
                                        console.log('ERROR');
                                        console.log(err);
                                        reject(err);
                                    });
                            }.bind(this))
                            .catch(function (err) {
                                reject(err);
                            });
                    }.bind(this));
                }
            }
        });

        return widget;
    });