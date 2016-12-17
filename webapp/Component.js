sap.ui.core.UIComponent.extend("sap.ui.demo.Component", {
	metadata: {
		name: "openui5_app",
		version: "1.0.0",
		includes: ["css/styles.css"],
		dependencies: {
			libs: ["sap.m"]
		},
		rootView: "sap.ui.demo.view.App"
	}
});
