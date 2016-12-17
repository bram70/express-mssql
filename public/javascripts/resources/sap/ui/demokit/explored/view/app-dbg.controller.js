/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2016 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(["jquery.sap.global", "sap/ui/core/Core", "sap/ui/core/Component", "sap/ui/core/mvc/Controller"], function (jQuery, Core, Component, Controller) {
	"use strict";

	return Controller.extend("sap.ui.demokit.explored.view.app", {

		onInit : function () {

			this._afterRenderingDone = false;

			// subscribe to app events
			this._component = Component.getOwnerComponentFor(this.getView());
			this._component.getEventBus().subscribe("app", "applyAppConfiguration", this._applyAppConfiguration, this);
		},

		onAfterRendering : function () {
			if (this.hasOwnProperty("_compactOn")) {
				jQuery('body').toggleClass("sapUiSizeCompact", this._compactOn).toggleClass("sapUiSizeCozy", !this._compactOn);
			}
			if (this.hasOwnProperty("_themeActive") && !jQuery.sap.getUriParameters().get("sap-theme") && !jQuery.sap.getUriParameters().get("sap-ui-theme")) {
				sap.ui.getCore().applyTheme(this._themeActive);
			}
			this._afterRenderingDone = true;
		},

		_applyAppConfiguration : function(sChannel, sEvent, oData){
			if (this._afterRenderingDone){
				//handle themeChange
				sap.ui.getCore().applyTheme(oData.themeActive);
				//handle compact mode
				jQuery('body').toggleClass("sapUiSizeCompact", oData.compactOn).toggleClass("sapUiSizeCozy", !oData.compactOn);

				// apply theme and compact mode also to iframe samples
				var oSampleFrame = sap.ui.getCore().byId("sampleFrame");
				if (oSampleFrame) {
					var oSampleFrameContent = oSampleFrame.$()[0].contentWindow;
					if (oSampleFrameContent) {
						oSampleFrameContent.sap.ui.getCore().applyTheme(oData.themeActive);
						oSampleFrameContent.jQuery('body').toggleClass("sapUiSizeCompact", oData.compactOn).toggleClass("sapUiSizeCozy", !oData.compactOn);
					}
				}
			} else {
				this._themeActive = oData.themeActive;
				this._compactOn = oData.compactOn;
			}

		}
	});

});
