/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2016 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/**
 * Initialization Code and shared classes of library sap.f.
 */
sap.ui.define(['jquery.sap.global',
	'sap/ui/core/library', 'sap/m/library'], // library dependency
	function() {

	'use strict';

	/**
	 * SAPUI5 library with controls specialized for Fiori applications.
	 *
	 * @namespace
	 * @name sap.f
	 * @author SAP SE
	 * @version 1.42.6
	 * @public
	 */

	// delegate further initialization of this library to the Core
	sap.ui.getCore().initLibrary({
		name : 'sap.f',
		version: '1.42.6',
		dependencies : ['sap.ui.core','sap.m'],
		types: [
			"sap.f.ThreeColumnLayoutType"
		],
		controls: [
			"sap.f.DynamicPage",
			"sap.f.DynamicPageHeader",
			"sap.f.DynamicPageTitle",
			"sap.f.FlexibleColumnLayout"
		],
		elements: []
	});

	/**
	 * Types of three-column layout for the sap.f.FlexibleColumnLayout control
	 *
	 * @enum {string}
	 * @public
	 * @since 1.42
	 * @ui5-metamodel This enumeration also will be described in the UI5 (legacy) designtime metamodel
	 */
	sap.f.ThreeColumnLayoutType = {

		/**
		 * Emphasized last column (endColumn) - column layout 25/25/50
		 * @public
		 */
		EndColumnEmphasized : "EndColumnEmphasized",

		/**
		 * Emphasized middle column (midColumn) - column layout 25/50/25
		 * @public
		 */
		MidColumnEmphasized : "MidColumnEmphasized"
	};

	return sap.f;

});
