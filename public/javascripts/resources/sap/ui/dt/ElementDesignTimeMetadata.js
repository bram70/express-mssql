/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2016 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['jquery.sap.global','sap/ui/dt/DesignTimeMetadata','sap/ui/dt/AggregationDesignTimeMetadata'],function(q,D,A){"use strict";var E=D.extend("sap.ui.dt.ElementDesignTimeMetadata",{metadata:{library:"sap.ui.dt"}});E.prototype.getDefaultData=function(d){var o=D.prototype.getDefaultData.apply(this,arguments);o.aggregations={layout:{ignore:true},dependents:{ignore:true},customData:{ignore:true},layoutData:{ignore:true},tooltip:{ignore:true}};return o;};E.prototype.hasAggregation=function(a){return!!this.getAggregations()[a];};E.prototype.getAggregation=function(a){return this.getAggregations()[a];};E.prototype.createAggregationDesignTimeMetadata=function(a){var d=this.getAggregation(a);return new A({data:d});};E.prototype.getAggregations=function(){return this.getData().aggregations;};E.prototype.getRelevantContainer=function(e){var g=this.getData().getRelevantContainer;if(!g||typeof g!=="function"){return e.getParent();}return g(e);};return E;},true);
