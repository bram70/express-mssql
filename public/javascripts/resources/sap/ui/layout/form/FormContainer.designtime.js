/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2016 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([],function(){"use strict";return{aggregations:{formElements:{domRef:function(){var d=this.getDomRef();if(!d&&this.getFormElements().length===0){var t=this.getTitle();if(t){return t.getDomRef();}}else{return d;}}}}};},false);
