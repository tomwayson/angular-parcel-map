(function(angular) {
    'use strict';
    angular.module('parcel-map-example', []);

    angular.module('parcel-map-example').directive('parcelMap', function($q) {

        return {
            // element only
            restrict: 'E',

            // isoloate scope
            scope: {
                // one way binding for parcel id because it's
                // currently only set outside this directive
                // we'd need to use two-way binding (=?)
                // if we also set this internally (i.e. via map click)
                parcelId: '@',
                // function binding for event handlers
                selectionComplete: '&'
            },

            // replace tag with div with same id
            compile: function($element, $attrs) {
                // remove the id attribute from the main element
                $element.removeAttr('id');

                // append a new div inside this element, this is where we will create our map
                $element.append('<div id=' + $attrs.id + '></div>');

                // since we are using compile we need to return our linker function
                // the 'link' function handles how our directive responds to changes in $scope
                /*jshint unused: false*/
                return function(scope, element, attrs, controller) {
                };
            },

            // directive api
            controller: function($scope, $element, $attrs) {
                // only do this once per directive
                // this deferred will be resolved with the map
                var mapDeferred = $q.defer();

                // load esri modules
                require([
                    'esri/map',
                    'esri/layers/ArcGISTiledMapServiceLayer', 'esri/layers/FeatureLayer',
                    'esri/symbols/SimpleFillSymbol', 'esri/symbols/SimpleLineSymbol', 'esri/Color',
                    'esri/tasks/query', 'esri/graphicsUtils'
                    ], function(Map,
                        ArcGISTiledMapServiceLayer, FeatureLayer,
                        SimpleFillSymbol, SimpleLineSymbol, Color,
                        Query, graphicsUtils
                ) {
                    // initialize map and add basemap
                    var map = new Map($attrs.id);
                    var basemap = new ArcGISTiledMapServiceLayer('http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/TaxParcel/AssessorsBasemap/MapServer/');
                    var originalExtent;
                    map.on('load', function() {
                        originalExtent = map.extent;
                    });
                    map.addLayer(basemap);

                    // add feature layer for selection
                    var sfs = new SimpleFillSymbol(
                      SimpleFillSymbol.STYLE_SOLID,
                      new SimpleLineSymbol(
                        SimpleLineSymbol.STYLE_SOLID,
                        new Color([111, 0, 255]),
                        2
                      ),
                      new Color([111, 0, 255, 0.15])
                    );
                    var parcels = new FeatureLayer('http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/TaxParcel/AssessorsBasemap/MapServer/1', {
                      outFields: ['*'],
                      mode: FeatureLayer.MODE_SELECTION
                    });
                    parcels.setSelectionSymbol(sfs);
                    map.addLayers([parcels]);

                    // clear selected parcels zoom to original extent
                    function clearSelectedParcels() {
                        parcels.clearSelection();
                        if (originalExtent) {
                            map.setExtent(originalExtent);
                        }
                    }

                    // select parcel by id and zoom to it
                    function selectParcelById(parcelId) {
                        var query = new Query();
                        query.where = 'PARCELID = \'' + parcelId + '\'';
                        parcels.selectFeatures(query, FeatureLayer.SELECTION_NEW, function (selection) {
                          // center map on selected parcel
                          if (selection.length < 1) {
                            return;
                          }
                          map.setExtent(graphicsUtils.graphicsExtent(selection).expand(2));
                        });
                    }

                    mapDeferred.resolve(map);

                    mapDeferred.promise.then(function(map)
                    {
                        // return selected parcels
                        parcels.on('selection-complete', function(features, method) {
                          if (!$attrs.selectionComplete) {
                                return;
                            }
                            $scope.$apply(function() {
                                $scope.selectionComplete()(features, method);
                            });
                        });

                        // listen for changes to scope parcel id and update map
                        $scope.$watch('parcelId', function(newParcelId, oldParcelId) {
                            if (map.loaded && newParcelId !== oldParcelId) {
                                if (!newParcelId) {
                                    clearSelectedParcels();
                                } else {
                                    selectParcelById(newParcelId);
                                }
                            }
                        });

                        // clean up
                        $scope.$on('$destroy', function () {
                            map.destroy();
                        });
                    });
                });
            }
        };
    });

})(angular);
