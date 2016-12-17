/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2016 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides the Design Time Metadata for the sap.uxap.ObjectPageSection control
sap.ui.define([],
	function() {
	"use strict";

	return {
		actions : {
			remove : {
				changeType : "stashControl",
				getState : function(oObjectPageSection) {
					return {
						control : oObjectPageSection,
						visible : oObjectPageSection.getVisible()
					};
				},
				restoreState : function(oObjectPageSection, oState) {
					oState.control.setVisible(oState.visible);
				}

			}
		}
	};

}, /* bExport= */ false);
