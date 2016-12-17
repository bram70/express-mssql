/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2016 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides acustomized router class for the 'explored' app.
sap.ui.define(['jquery.sap.global', 'sap/ui/core/routing/History', 'sap/ui/core/routing/Router', 'sap/ui/core/Core'],
	function(jQuery, History, Router, Core) {
	"use strict";



	var MyRouter = Router.extend("sap.ui.demokit.explored.util.MyRouter", {

		/**
		 * mobile nav back handling
		 */
		myNavBack : function (sRoute, oData) {
			var oHistory = History.getInstance();
			var oPrevHash = oHistory.getPreviousHash();
			if (oPrevHash !== undefined) {
				window.history.go(-1);
			} else {
				var bReplace = true; // otherwise we go backwards with a forward history
				this.navTo(sRoute, oData, bReplace);
			}
		},

		/**
		 * a nav to method that does not write hashes but load the views properly
		 */
		myNavToWithoutHash : function (viewName, viewType, master, data) {
			var app = sap.ui.getCore().byId("splitApp");
			var view = this.getView(viewName, viewType);
			app.addPage(view, master);
			app.toDetail(view.getId(), "show", data);
		}
	});

	return MyRouter;

});
