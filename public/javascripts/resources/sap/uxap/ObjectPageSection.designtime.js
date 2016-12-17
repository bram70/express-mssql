/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2016 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([],function(){"use strict";return{actions:{remove:{changeType:"stashControl",getState:function(o){return{control:o,visible:o.getVisible()};},restoreState:function(o,s){s.control.setVisible(s.visible);}}}};},false);
