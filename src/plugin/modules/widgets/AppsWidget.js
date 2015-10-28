/*global define */
/*jslint white: true */
define([
    'bluebird',
    'kb_service_narrativeMethodStore',
    'kb_service_api',
    'kb_common_logger',
    'kb_common_html',
    'kb_widgetBases_standardWidget',
    'kb_common_widgetSet',
    'bootstrap'
],
    function (Promise, NarrativeMethodStore, fServiceApi, Logger, html, standardWidget, WidgetSet) {
        'use strict';

        function xfactory(config) {
            var container, runtime = config.runtime,
                widgetSet = WidgetSet.make({runtime: runtime});

            function renderPanel(content) {
                var div = html.tag('div'),
                    span = html.tag('span');

                return div({class: 'panel panel-default'}, [
                    div({class: 'panel-heading'}, [
                        div({class: 'kb-row'}, [
                            div({class: '-col -span-8'}, [
                                span({class: 'fa fa-cubes pull-left', style: {fontSize: '150%', paddingRight: '10px'}}),
                                span({class: 'panel-title', style: {verticalAlign: 'middle'}, dataPlaceholder: 'title'}, [
                                    content.title
                                ])
                            ]),
                            div({class: '-col -span-4', style: {textAlign: 'right'}}, [
                                div({class: 'btn-group', dataPlaceholder: 'buttons'})
                            ])
                        ])
                    ]),
                    div({class: 'panel-body'}, [
                        div({dataPlaceholder: 'alert'}),
                        div({dataPlaceholder: 'content'}, content.content)
                    ])
                ]);
            }

            function attach(node) {
                container = node;
                container.innerHTML = renderPanel({
                    title: 'KBase Apps',
                    content: 'This will be kbase apps'
                });
                return widgetSet.attach(node);
            }
            function start(params) {
                return widgetSet.start(params);
            }
            function stop() {
                return widgetSet.stop();
            }
            function detach() {
                return widgetSet.detach();
            }

            return {
                attach: attach,
                start: start,
                stop: stop,
                detach: detach
            };
        }


        function factory(config) {
            var div = html.tag('div'),
                span = html.tag('span'),
                table = html.tag('table'),
                tr = html.tag('tr'),
                td = html.tag('td'),
                th = html.tag('th'),
                a = html.tag('a'),
                i = html.tag('i'),
                h4 = html.tag('h4');

            function renderPanel(content) {
                return div({class: 'panel panel-default dashboardAppsWidget', dataWidget: 'dashboardApps'}, [
                    div({class: 'panel-heading'}, [
                        div({class: 'kb-row'}, [
                            div({class: '-col -span-8'}, [
                                span({class: 'fa fa-cubes pull-left', style: {fontSize: '150%', paddingRight: '10px'}}),
                                span({class: 'panel-title', style: {verticalAlign: 'middle'}, dataPlaceholder: 'title'}, [
                                    content.title
                                ])
                            ]),
                            div({class: '-col -span-4', style: {textAlign: 'right'}}, [
                                div({class: 'btn-group', dataPlaceholder: 'buttons'})
                            ])
                        ])
                    ]),
                    div({class: 'panel-body'}, [
                        div({dataPlaceholder: 'alert'}),
                        div({dataPlaceholder: 'content'}, content.content)
                    ])
                ]);
            }

            function renderApps(w, type) {
                var apps = w.getState('appOwnership')[type];
                if (apps.length === 0) {
                    return div({style: {font: 'italic', textAlign: 'center'}}, [
                        'No Apps found.'
                    ]);
                }
                return apps.map(function (app) {
                    return  table({class: 'table table-borderless hoverable'}, [
                        tr([
                            td({valign: 'baseline', style: {verticalAlign: 'top'}}, [
                                a({href: '#narrativestore/app/' + app.app.id, target: '_blank'}, app.app.name)
                            ]),
                            td({width: '30px', valign: 'baseline', style: {verticalAlign: 'top'}}, [
                                div({class: '-switchable'}, [
                                    div({class: '-if-inactive'}, [
                                        span({class: '-appcount'}, app.count)
                                    ]),
                                    div({class: '-if-active'}, [
                                        a({href: '#narrativemanager/new?app=' + app.app.id, class: 'btn btn-default btn-link', target: '_blank', dataToggle: 'tooltip', dataPlacement: 'auto', title: 'Create a new Narrative using this App', dataContainer: 'body'}, [
                                            span({class: '-icon'}, [
                                                span({class: 'fa-stack'}, [
                                                    i({class: 'fa fa-file fa-stack-2x'}),
                                                    i({class: 'fa fa-plus fa-inverse fa-stack-1x', style: {marginTop: '3px'}})
                                                ])
                                            ])
                                        ])
                                    ])
                                ])
                            ])
                        ])
                    ]);
                });
            }

            function renderData(w) {
                return table({class: 'apps'}, [
                    tr([
                        th(h4('Your Favorites')),
                        th(h4("Collaborator's Favorites")),
                        th(h4('Public Favorites'))
                    ]),
                    tr([
                        td(renderApps(w, 'owned')),
                        td(renderApps(w, 'shared')),
                        td(renderApps(w, 'public'))
                    ])
                ]);
            }

            return standardWidget.make({
                runtime: config.runtime,
                title: 'KBase Apps',
                on: {
                    initialContent: function (w) {
                        return html.loading();
                    },
                    start: function (w, params) {
                        var methodStore = new NarrativeMethodStore(w.runtime.getConfig('services.narrative_method_store.url'), {
                            token: w.runtime.getService('session').getAuthToken()
                        }),
                            kbService = fServiceApi.make({runtime: w.runtime});

                        return Promise.try(function () {
                            var allApps,
                                appMap = {};
                            if (!w.runtime.getService('session').isLoggedIn()) {
                                w.setState('apps', null);
                                return;
                            }
                            return Promise.resolve(methodStore.list_apps_full_info({}))
                                .then(function (result) {
                                    allApps = result;
                                    allApps.forEach(function (x) {
                                        appMap[x.id] = {
                                            owned: {
                                                count: 0,
                                                narratives: {}
                                            },
                                            shared: {
                                                count: 0,
                                                narratives: {}
                                            },
                                            public: {
                                                count: 0,
                                                narratives: {}
                                            }
                                        };
                                    });
                                    return [allApps, kbService.getNarratives({
                                            params: {showDeleted: 0}
                                        })];
                                })
                                .spread(function (allApps, narratives) {
                                    // Now we have all the narratives this user can see.
                                    // now bin them by app.
                                    var appList, appOwnership;
                                    narratives.forEach(function (narrative) {
                                        var apps, methods, bin;
                                        if (narrative.object.metadata.methods) {
                                            methods = JSON.parse(narrative.object.metadata.methods);
                                            apps = methods.app;

                                            if (narrative.workspace.owner === w.runtime.getService('session').getUsername()) {
                                                bin = 'owned';
                                            } else if (narrative.workspace.globalread === 'n') {
                                                bin = 'shared';
                                            } else {
                                                bin = 'public';
                                            }
                                            Object.keys(apps).forEach(function (app) {
                                                // simple object, don't need to check.
                                                if (!appMap[app]) {
                                                    Logger.logWarning({
                                                        source: 'AppsWidget',
                                                        title: 'Skipped App',
                                                        message: 'The app "' + app + '" was skipped because it is not in the Apps Store'
                                                    });
                                                } else {
                                                    appMap[app][bin].count += 1;
                                                    appMap[app][bin].narratives[narrative.workspace.id] = 1;
                                                }
                                            });
                                        }
                                    });

                                    allApps.forEach(function (x) {
                                        x.narrativeCount = appMap[x.id];
                                    });
                                    appList = allApps.sort(function (a, b) {
                                        if (a.name < b.name) {
                                            return -1;
                                        }
                                        if (a.name > b.name) {
                                            return 1;
                                        }
                                        return 0;
                                    });
                                    w.setState('appList', appList);

                                    // Now twist this and get narrative count per app by ownership category.
                                    appOwnership = {owned: [], shared: [], public: []};
                                    allApps.forEach(function (app) {
                                        ['owned', 'shared', 'public'].forEach(function (ownerType) {
                                            if (app.narrativeCount[ownerType].count > 0) {
                                                appOwnership[ownerType].push({
                                                    count: app.narrativeCount[ownerType].count,
                                                    app: app
                                                });
                                            }
                                        });
                                    });
                                    w.setState('appOwnership', appOwnership);
                                });
                        });
                    },
                    render: function (w) {
                        // just test for now...
                        return renderPanel({
                            title: 'KBase Apps',
                            content: renderData(w)
                        });
                    }
                },
                events: [
                    {
                        type: 'mouseenter',
                        selector: 'table.hoverable tr',
                        handler: function (e) {
//                            var obj = e.currentTarget;
//                            while (obj !== null) {
//                                if (obj === this) {
//                                    return;
//                                }
//                                obj = obj.parentNode;
//                            }
                            // e.preventDefault();
                            // e.stopPropagation();
                            e.target.classList.add('-active')
                        },
                        capture: true
                    },
                    {
                        type: 'mouseleave',
                        selector: 'table.hoverable tr',
                        handler: function (e) {
//                            var obj = e.currentTarget;
//                            while (obj !== null) {
//                                if (obj === this) {
//                                    return;
//                                }
//                                obj = obj.parentNode;
//                            }
                            e.target.classList.remove('-active')
                        },
                        capture: true
                    }
                ]
            });
        }

        return {
            make: function (config) {
                return factory(config);
            }
        };
    });