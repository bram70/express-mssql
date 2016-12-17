/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2016 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(['sap/ui/core/UIComponent', 'sap/ui/demokit/demoapps/model/libraryData', "sap/ui/model/json/JSONModel"],
	function(UIComponent, libraryData, JSONModel) {
		"use strict";


		return UIComponent.extend("sap.ui.demokit.demoapps.Component", {
			metadata : {
				rootView: "sap.ui.demokit.demoapps.view.Root",
				includes: [
					"css/style.css"
				]
			},

			init : function () {
				UIComponent.prototype.init.apply(this, arguments);
				var oModel = new JSONModel();
				this.setModel(oModel);
				libraryData.fillJSONModel(oModel);
			}
		});
	}
);
