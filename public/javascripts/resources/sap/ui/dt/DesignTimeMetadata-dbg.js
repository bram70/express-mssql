/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2016 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.dt.DesignTimeMetadata.
sap.ui.define([
	'jquery.sap.global',
	'sap/ui/base/ManagedObject',
	'sap/ui/dt/ElementUtil',
	'sap/ui/dt/DOMUtil'
],
function(jQuery, ManagedObject, ElementUtil, DOMUtil) {
	"use strict";


	/**
	 * Constructor for a new DesignTimeMetadata.
	 *
	 * @param {string} [sId] id for the new object, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new object
	 *
	 * @class
	 * The DesignTimeMetadata is a wrapper for the DesignTimeMetadata of the associated element
	 * @extends sap.ui.core.ManagedObject
	 *
	 * @author SAP SE
	 * @version 1.42.6
	 *
	 * @constructor
	 * @private
	 * @since 1.30
	 * @alias sap.ui.dt.DesignTimeMetadata
	 * @experimental Since 1.30. This class is experimental and provides only limited functionality. Also the API might be changed in future.
	 */
	var DesignTimeMetadata = ManagedObject.extend("sap.ui.dt.DesignTimeMetadata", /** @lends sap.ui.dt.DesignTimeMetadata.prototype */ {
		metadata : {
			// ---- object ----

			// ---- control specific ----
			library : "sap.ui.dt",
			properties : {
				/**
				 * Data to be used as DT metadata
				 */
				data : {
					type : "object"
				}
			}
		}
	});

	/**
	 * Sets the data as DT metadata, uses default settings, if some fields are not defined in oData
	 * @param {object} oData to set
	 * @return {sap.ui.dt.DesignTimeMetadata} returns this
	 * @protected
	 */
	DesignTimeMetadata.prototype.setData = function(oData) {

		var oMergedData = jQuery.extend(true, this.getDefaultData(), oData || {});

		this.setProperty("data", oMergedData);
		return this;
	};

	/**
	 * Returns data, if no data is set, creates a default data
	 * @return {object} returns data
	 * @public
	 */
	DesignTimeMetadata.prototype.getData = function() {
		var oData = this.getProperty("data");
		if (!oData) {
			this.setData({});
			oData = this.getProperty("data");
		}

		return oData;
	};

	/**
	 * Returns the default DT metadata
	 * @return {Object} default data
	 * @protected
	 */
	DesignTimeMetadata.prototype.getDefaultData = function() {
		return {
			ignore : false,
			domRef : undefined,
			cloneDomRef : false
		};
	};

	/**
	 * Returns property "ignore" of the DT metadata
	 * @return {boolean} if ignored
	 * @public
	 */
	DesignTimeMetadata.prototype.isIgnored = function() {
		return this.getData().ignore;
	};

	/**
	 * Returns property "copyDom" of the DT metadata
	 * @return {boolean} if overlay should copy the DOM of its associated element
	 * @public
	 */
	DesignTimeMetadata.prototype.getCloneDomRef = function() {
		return this.getData().cloneDomRef;
	};

	/**
	 * Returns property "domRef" of the DT metadata
	 * @return {string|Element} assosicated domRef
	 * @public
	 */
	DesignTimeMetadata.prototype.getDomRef = function() {
		return this.getData().domRef;
	};

	DesignTimeMetadata.prototype.getAssociatedDomRef = function(sAction, oElement) {

		var oElementDomRef = ElementUtil.getDomRef(oElement);
		var vAssociatedDomRef = this.getAction(sAction, oElement).domRef;

		if (oElementDomRef) {
			if (typeof vAssociatedDomRef === "string") {
				return DOMUtil.getDomRefForCSSSelector(oElementDomRef, vAssociatedDomRef).get(0);
			} else if (typeof vAssociatedDomRef === "function") {
				return vAssociatedDomRef.call(this, oElement);
			}
		} else {
			if (typeof vAssociatedDomRef === "function") {
				return vAssociatedDomRef.call(this, oElement);
			}
		}
	};

	/**
	 * Returns action sAction part of designTime metadata (object or changeType string)
	 * @param  {string} sAction action name
	 * @param  {object} oElement element instance
	 * @return {map} part of designTimeMetada, which describes sAction in a map format
	 * @public
	 */
	DesignTimeMetadata.prototype.getAction = function(sAction, oElement) {
		var mData = this.getData();
		if (mData.actions && mData.actions[sAction]) {
			var vAction = mData.actions[sAction];
			if (typeof (vAction) === "function" ) {
				vAction = vAction.call(null, oElement);
			}

			if (typeof (vAction) === "string" ) {
				return { changeType : vAction };
			} else {
				return vAction;
			}
		}
	};

	return DesignTimeMetadata;
}, /* bExport= */ true);