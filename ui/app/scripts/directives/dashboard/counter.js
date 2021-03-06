(function() {
    'use strict';
    angular.module('theHiveDirectives').directive('dashboardCounter', function($http, $state, DashboardSrv, NotificationSrv, GlobalSearchSrv) {
        return {
            restrict: 'E',
            scope: {
                filter: '=?',
                options: '=',
                entity: '=',
                autoload: '=',
                mode: '=',
                refreshOn: '@',
                metadata: '='
            },
            templateUrl: 'views/directives/dashboard/counter/view.html',
            link: function(scope) {
                scope.error = false;
                scope.data = null;
                scope.globalQuery = null;

                scope.load = function() {
                    if(!scope.entity) {
                        scope.error = true;
                        return;
                    }

                    var query = DashboardSrv.buildChartQuery(scope.filter, scope.options.query);
                    scope.globalQuery = query;

                    var statsPromise = $http.post('./api' + scope.entity.path + '/_stats', {
                        query: query,
                        stats: _.map(scope.options.series || [], function(serie, index) {
                            var s = {
                                _agg: serie.agg,
                                _name: 'agg_' + (index + 1),
                                _query: serie.query || {}
                            };

                            if(serie.agg !== 'count') {
                                s._field = serie.field;
                            }

                            return s;
                        })
                    });

                    statsPromise.then(function(response) {
                        scope.error = false;
                        var data = response.data;

                        scope.data = _.map(scope.options.series || [], function(serie, index) {
                            var name = 'agg_' + (index + 1);
                            return {
                                serie: serie,
                                agg: serie.agg,
                                name: name,
                                label: serie.label,
                                value: data[name] || 0
                            }
                        });

                    }, function(err) {
                        scope.error = true;
                        NotificationSrv.log('Failed to fetch data, please edit the widget definition', 'error');
                    });
                };

                scope.openSearch = function(item) {
                  var criteria = [{ _type: scope.options.entity }, item.serie.query];

                  if (scope.globalQuery && scope.globalQuery !== '*') {
                      criteria.push(scope.globalQuery);
                  }

                  var searchQuery = {
                      _and: _.without(criteria, null, undefined, '')
                  };

                  GlobalSearchSrv.saveSection(scope.options.entity, {
                      search: null,
                      filters: scope.options.filters.concat(item.serie.filters)
                  });
                  $state.go('app.search');
                };

                if (scope.autoload === true) {
                    scope.load();
                }

                if (!_.isEmpty(scope.refreshOn)) {
                    scope.$on(scope.refreshOn, function(event, filter) {
                        scope.filter = filter;
                        scope.load();
                    });
                }
            }
        };
    });
})();
