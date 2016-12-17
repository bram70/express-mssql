/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2016 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define([
		'jquery.sap.global', "sap/ui/fl/changeHandler/JsControlTreeModifier"
	], function (jQuery, JsControlTreeModifier) {
		"use strict";

		/**
		 * Change handler for hiding of a control.
		 * @alias sap.ui.fl.changeHandler.HideControl
		 * @author SAP SE
		 * @version 1.42.6
		 * @experimental Since 1.27.0
		 */
		var UnhideForm = {};

		/**
		 * Completes the change by adding change handler specific content
		 *
		 * @param {sap.ui.fl.Change} oChange - change object to be completed
		 * @param {object} - oSpecificChangeInfo with attribute sUnhideId, the id of the control to unhide
		 * @param {object} mPropertyBag - map containing the application component
		 * @public
		 */
		UnhideForm.completeChangeContent = function (oChange, oSpecificChangeInfo, mPropertyBag) {
			var oChangeDefinition = oChange.getDefinition();
			if (oSpecificChangeInfo.sUnhideId) {
				var oUnhideElement = sap.ui.getCore().byId(oSpecificChangeInfo.sUnhideId);
				oChangeDefinition.content.elementSelector = JsControlTreeModifier.getSelector(oUnhideElement, mPropertyBag.appComponent);
			} else {
				throw new Error("oSpecificChangeInfo.sUnhideId attribute required");
			}
		};

		/**
		 * Unhides a control.
		 *
		 * @param {sap.ui.fl.Change} oChange - change object with instructions to be applied on the control map
		 * @param {sap.ui.core.Control} oControl - control that matches the change selector for applying the change
		 * @param {object} mPropertyBag - map containing the control modifier object (either sap.ui.fl.changeHandler.JsControlTreeModifier or
		 *								sap.ui.fl.changeHandler.XmlTreeModifier), the view object where the controls are embedded and the application component
		 * @public
		 */
		UnhideForm.applyChange = function (oChange, oControl, mPropertyBag) {
			var oModifier = mPropertyBag.modifier;
			var oView = mPropertyBag.view;
			var oAppComponent = mPropertyBag.appComponent;

			var oChangeDefinition = oChange.getDefinition();

			// !important : sUnhideId was used in 1.40, do not remove for compatibility!
			var oControlToUnhide = oModifier.bySelector(oChangeDefinition.content.elementSelector || oChangeDefinition.content.sUnhideId, oAppComponent, oView);
			var aContent = oModifier.getAggregation(oControl, "content");
			var iStart = -1;

			if (oChangeDefinition.changeType === "unhideSimpleFormField") {
				aContent.some(function (oField, index) {
					if (oField === oControlToUnhide) {
						iStart = index;
						oModifier.setVisible(oField, true);
					}
					if (iStart >= 0 && index > iStart) {
						if ((oModifier.getControlType(oField) === "sap.m.Label") || (oModifier.getControlType(oField) === "sap.ui.core.Title")) {
							return true;
						} else {
							oModifier.setVisible(oField, true);
						}
					}
				});
			}

			return true;
		};

		return UnhideForm;
	},
	/* bExport= */true);
