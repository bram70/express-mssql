/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2016 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

//Provides class sap.ui.model.odata.v4.ODataListBinding
sap.ui.define([
	"jquery.sap.global",
	"sap/ui/model/Binding",
	"sap/ui/model/ChangeReason",
	"sap/ui/model/FilterType",
	"sap/ui/model/ListBinding",
	"sap/ui/model/odata/OperationMode",
	"./_ODataHelper",
	"./Context",
	"./lib/_Cache",
	"./lib/_Helper",
	"./lib/_SyncPromise"
], function (jQuery, Binding, ChangeReason, FilterType, ListBinding, OperationMode, _ODataHelper,
	Context, _Cache, _Helper, _SyncPromise) {
	"use strict";

	var sClassName = "sap.ui.model.odata.v4.ODataListBinding",
		mSupportedEvents = {
			change : true,
			dataReceived : true,
			dataRequested : true,
			refresh : true
		};

	/**
	 * DO NOT CALL this private constructor for a new <code>ODataListBinding</code>,
	 * but rather use {@link sap.ui.model.odata.v4.ODataModel#bindList bindList} instead!
	 *
	 * @param {sap.ui.model.odata.v4.ODataModel} oModel
	 *   The OData V4 model
	 * @param {string} sPath
	 *   The binding path in the model; must not be empty or end with a slash
	 * @param {sap.ui.model.odata.v4.Context} [oContext]
	 *   The parent context which is required as base for a relative path
	 * @param {sap.ui.model.Sorter | sap.ui.model.Sorter[]} [vSorters]
	 *   The dynamic sorters to be used initially. Call {@link #sort} to replace them. Static
	 *   sorters, as defined in the '$orderby' binding parameter, are always executed after the
	 *   dynamic sorters.
	 *   Supported since 1.39.0.
	 * @param {sap.ui.model.Filter | sap.ui.model.Filter[]} [vFilters]
	 *   The dynamic application filters to be used initially. Call {@link #filter} to replace them.
	 *   Static filters, as defined in the '$filter' binding parameter, are always combined with the
	 *   dynamic filters using a logical <code>AND</code>.
	 *   Supported since 1.39.0.
	 * @param {object} [mParameters]
	 *   Map of binding parameters which can be OData query options as specified in
	 *   "OData Version 4.0 Part 2: URL Conventions" or the binding-specific parameters "$$groupId"
	 *   and "$$updateGroupId".
	 *   Note: If parameters are provided for a relative binding path, the binding accesses data
	 *   with its own service requests instead of using its parent binding.
	 *   The following OData query options are allowed:
	 *   <ul>
	 *   <li> All "5.2 Custom Query Options" except for those with a name starting with "sap-"
	 *   <li> The $expand, $filter, $orderby and $select "5.1 System Query Options"
	 *   </ul>
	 *   All other query options lead to an error.
	 *   Query options specified for the binding overwrite model query options.
	 * @param {sap.ui.model.odata.OperationMode} [mParameters.$$operationMode]
	 *   The operation mode for sorting with the model's operation mode as default. Since 1.39.0,
	 *   the operation mode {@link sap.ui.model.odata.OperationMode.Server} is supported. All other
	 *   operation modes including <code>undefined</code> lead to an error if 'vSorters' are given
	 *   or if {@link #sort} is called.
	 * @param {string} [mParameters.$$groupId]
	 *   The group ID to be used for <b>read</b> requests triggered by this binding; if not
	 *   specified, either the parent binding's group ID (if the binding is relative) or the
	 *   model's group ID is used, see {@link sap.ui.model.odata.v4.ODataModel#constructor}.
	 *   Valid values are <code>undefined</code>, <code>'$auto'</code>, <code>'$direct'</code> or
	 *   application group IDs as specified in {@link sap.ui.model.odata.v4.ODataModel#submitBatch}.
	 * @param {string} [mParameters.$$updateGroupId]
	 *   The group ID to be used for <b>update</b> requests triggered by this binding;
	 *   if not specified, either the parent binding's update group ID (if the binding is relative)
	 *   or the model's update group ID is used,
	 *   see {@link sap.ui.model.odata.v4.ODataModel#constructor}.
	 *   For valid values, see parameter "$$groupId".
	 * @throws {Error}
	 *   If disallowed binding parameters are provided or an unsupported operation mode is used
	 *
	 * @alias sap.ui.model.odata.v4.ODataListBinding
	 * @author SAP SE
	 * @class List binding for an OData V4 model.
	 *   An event handler can only be attached to this binding for the following events: 'change',
	 *   'dataReceived', 'dataRequested', and 'refresh'.
	 *   For other events, an error is thrown.
	 * @extends sap.ui.model.ListBinding
	 * @public
	 * @version 1.42.6
	 */
	var ODataListBinding = ListBinding.extend("sap.ui.model.odata.v4.ODataListBinding", {
			constructor : function (oModel, sPath, oContext, vSorters, vFilters, mParameters) {
				var oBindingParameters,
					sOrderby;

				ListBinding.call(this, oModel, sPath);

				if (!sPath || sPath.slice(-1) === "/") {
					throw new Error("Invalid path: " + sPath);
				}
				oBindingParameters = _ODataHelper.buildBindingParameters(mParameters,
					["$$groupId", "$$operationMode", "$$updateGroupId"]);
				this.sGroupId = oBindingParameters.$$groupId;
				this.sOperationMode = oBindingParameters.$$operationMode || oModel.sOperationMode;
				this.sUpdateGroupId = oBindingParameters.$$updateGroupId;

				if (!this.sOperationMode && (vSorters || vFilters)) {
					throw new Error("Unsupported operation mode: " + this.sOperationMode);
				}

				this.aApplicationFilters = _ODataHelper.toArray(vFilters);
				this.oCache = undefined;
				this.sChangeReason = undefined;
				this.aDiff = [];
				this.aFilters = [];
				this.aPreviousData = [];
				this.mQueryOptions = undefined;
				this.sRefreshGroupId = undefined;
				this.aSorters = _ODataHelper.toArray(vSorters);

				if (!this.bRelative || mParameters) {
					this.mQueryOptions = _ODataHelper.buildQueryOptions(oModel.mUriParameters,
						mParameters, _ODataHelper.aAllowedSystemQueryOptions);
				}
				if (!this.bRelative) {
					if (this.aApplicationFilters.length > 0) {
						this.oCache = _ODataHelper.createListCacheProxy(this);
					} else {
						sOrderby = _ODataHelper.buildOrderbyOption(this.aSorters,
							this.mQueryOptions && this.mQueryOptions.$orderby);
						this.oCache = _Cache.create(oModel.oRequestor, sPath.slice(1),
							_ODataHelper.mergeQueryOptions(this.mQueryOptions, sOrderby));
					}
				}

				this.reset();
				this.setContext(oContext);
				oModel.bindingCreated(this);
			}
		});

	/**
	 * Deletes the entity identified by the edit URL.
	 *
	 * @param {string} [sGroupId=getUpdateGroupId()]
	 *   The group ID to be used for the DELETE request
	 * @param {string} sEditUrl
	 *   The edit URL to be used for the DELETE request
	 * @param {number} oContext
	 *   The context to be deleted
	 * @returns {Promise}
	 *   A promise which is resolved without a result in case of success, or rejected with an
	 *   instance of <code>Error</code> in case of failure.
	 * @throws {Error}
	 *   If there are pending changes.
	 *
	 * @private
	 */
	ODataListBinding.prototype._delete = function (sGroupId, sEditUrl, oContext) {
		var that = this;

		if (this.hasPendingChanges()) {
			throw new Error("Cannot delete due to pending changes");
		}
		return this.deleteFromCache(sGroupId, sEditUrl, String(oContext.getIndex()),
			function (iIndex) {
				var i,
					oNextContext;

				for (i = iIndex; i < that.aContexts.length; i += 1) {
					oContext = that.aContexts[i];
					oNextContext = that.aContexts[i + 1];
					if (oContext && !oNextContext) {
						oContext.destroy();
						delete that.aContexts[i];
					} else if (!oContext && oNextContext) {
						that.aContexts[i]
							= Context.create(that.oModel, that, that.sPath + "/" + i, i);
					} else if (!that.bUseExtendedChangeDetection) {
						that.oModel.getDependentBindings(oContext).forEach(function (oBinding) {
							oBinding.checkUpdate();
						});
					}
				}
				that.aContexts.pop();
				that.iMaxLength -= 1; // this doesn't change Infinity
				if (that.bUseExtendedChangeDetection) {
					that.aDiff = [{index : iIndex, type : "delete"}];
				}
				that._fireChange({reason : ChangeReason.Remove});
			});
	};

	/**
	 * The 'change' event is fired when the binding is initialized or new contexts are created or
	 * its parent context is changed. It is to be used by controls to get notified about changes to
	 * the binding contexts of this list binding. Registered event handlers are called with the
	 * change reason as parameter.
	 *
	 * @param {sap.ui.base.Event} oEvent
	 * @param {object} oEvent.getParameters
	 * @param {sap.ui.model.ChangeReason} oEvent.getParameters.reason
	 *   The reason for the 'change' event: {@link sap.ui.model.ChangeReason.Change Change}
	 *   when the binding is initialized and or a new context is created, or
	 *   {@link sap.ui.model.ChangeReason.Context Context} when the parent context is changed
	 *
	 * @event
	 * @name sap.ui.model.odata.v4.ODataListBinding#change
	 * @protected
	 * @see sap.ui.base.Event
	 * @since 1.37.0
	 */

	/**
	 * The 'dataRequested' event is fired directly after data has been requested from a back end.
	 * It is to be used by applications for example to switch on a busy indicator.
	 * Registered event handlers are called without parameters.
	 *
	 * @param {sap.ui.base.Event} oEvent
	 *
	 * @event
	 * @name sap.ui.model.odata.v4.ODataListBinding#dataRequested
	 * @public
	 * @see sap.ui.base.Event
	 * @since 1.37.0
	 */

	/**
	 * The 'dataReceived' event is fired after the back-end data has been processed and the
	 * registered 'change' event listeners have been notified.
	 * It is to be used by applications for example to switch off a busy indicator or to process an
	 * error.
	 * If back-end requests are successful, the event has no parameters. Use the binding's contexts
	 * via {@link #getCurrentContexts oEvent.getSource().getCurrentContexts()} to access the
	 * response data. Note that controls bound to this data may not yet have been updated, meaning
	 * it is not safe for registered event handlers to access data via control APIs.
	 *
	 * If a back-end request fails, the 'dataReceived' event provides an <code>Error</code> in the
	 * 'error' event parameter.
	 *
	 * @param {sap.ui.base.Event} oEvent
	 * @param {object} oEvent.getParameters
	 * @param {Error} [oEvent.getParameters.error] The error object if a back-end request failed.
	 *   If there are multiple failed back-end requests, the error of the first one is provided.
	 *
	 * @event
	 * @name sap.ui.model.odata.v4.ODataListBinding#dataReceived
	 * @public
	 * @see sap.ui.base.Event
	 * @since 1.37.0
	 */

	// See class documentation
	// @override
	// @public
	// @see sap.ui.base.EventProvider#attachEvent
	// @since 1.37.0
	ODataListBinding.prototype.attachEvent = function (sEventId) {
		if (!(sEventId in mSupportedEvents)) {
			throw new Error("Unsupported event '" + sEventId
				+ "': v4.ODataListBinding#attachEvent");
		}
		return ListBinding.prototype.attachEvent.apply(this, arguments);
	};

	/**
	 * Creates contexts for this list binding in the given range for the given result length of
	 * the OData response. Fires change and dataReceived events.
	 *
	 * @param {object} oRange
	 *   The range as returned by {@link _ODataHelper#getReadRange}
	 * @param {number} iResultLength
	 *   The number of OData entities read from the cache for the given range
	 * @param {string} sChangeReason
	 *   The reason with which the change event is sent
	 * @param {boolean} bDataRequested
	 *   Whether data has been requested from the server by the cache
	 *
	 * @private
	 */
	ODataListBinding.prototype.createContexts = function (oRange, iResultLength, sChangeReason,
				bDataRequested) {
		var bChanged = false,
			oContext = this.oContext,
			i,
			bNewLengthFinal,
			oModel = this.oModel,
			sResolvedPath = oModel.resolve(this.sPath, oContext);

		for (i = oRange.start; i < oRange.start + iResultLength; i += 1) {
			if (this.aContexts[i] === undefined) {
				bChanged = true;
				this.aContexts[i] = Context.create(oModel, this, sResolvedPath + "/" + i, i);
			}
		}
		if (this.aContexts.length > this.iMaxLength) { // upper boundary obsolete: reset it
			this.iMaxLength = Infinity;
		}
		if (iResultLength < oRange.length) {
			this.iMaxLength = oRange.start + iResultLength;
			if (this.aContexts.length > this.iMaxLength) {
				this.aContexts.length = this.iMaxLength;
			}
		}
		bNewLengthFinal = this.aContexts.length === this.iMaxLength;
		if (this.bLengthFinal !== bNewLengthFinal) {
			this.bLengthFinal = bNewLengthFinal;
			// bLengthFinal changed --> send change event even if no new data is available
			bChanged = true;
		}

		if (bChanged) {
			this._fireChange({reason : sChangeReason});
		}
		if (bDataRequested) {
			this.fireDataReceived(); // no try catch needed: uncaught in promise
		}
	};

	/**
	 * Deletes the entity in the cache. If the binding doesn't have a cache, it forwards to the
	 * parent binding adjusting the path.
	 *
	 * @param {string} sGroupId
	 *   The group ID to be used for the DELETE request
	 * @param {string} sEditUrl
	 *   The edit URL to be used for the DELETE request
	 * @param {string} sPath
	 *   The path of the entity relative to this binding
	 * @param {function} fnCallback
	 *   A function which is called after the entity has been deleted from the server and from the
	 *   cache; the index of the entity is passed as parameter
	 * @returns {Promise}
	 *   A promise which is resolved without a result in case of success, or rejected with an
	 *   instance of <code>Error</code> in case of failure.
	 * @throws {Error}
	 *   If the resulting group ID is neither "$auto" nor "$direct"
	 *
	 * @private
	 */
	ODataListBinding.prototype.deleteFromCache = function (sGroupId, sEditUrl, sPath, fnCallback) {
		var oPromise;

		if (this.oCache) {
			sGroupId = sGroupId || this.getUpdateGroupId();
			if (sGroupId !== "$auto" && sGroupId !== "$direct") {
				throw new Error("Illegal update group ID: " + sGroupId);
			}
			oPromise = this.oCache._delete(sGroupId, sEditUrl, sPath, fnCallback);
			this.oModel.addedRequestToGroup(sGroupId);
			return oPromise;
		}
		return this.oContext.getBinding().deleteFromCache(sGroupId, sEditUrl,
			_Helper.buildPath(this.oContext.getIndex(), this.sPath, sPath), fnCallback);
	};

	/**
	 * Deregisters the given change listener.
	 *
	 * @param {string} sPath
	 *   The path
	 * @param {sap.ui.model.odata.v4.ODataPropertyBinding} oListener
	 *   The change listener
	 * @param {number} iIndex
	 *   Index corresponding to some current context of this binding
	 *
	 * @private
	 */
	ODataListBinding.prototype.deregisterChange = function (sPath, oListener, iIndex) {
		if (this.oCache) {
			this.oCache.deregisterChange(iIndex, sPath, oListener);
		} else if (this.oContext) {
			this.oContext.deregisterChange(_Helper.buildPath(this.sPath, iIndex, sPath), oListener);
		}
	};

	/**
	 * Destroys the object. The object must not be used anymore after this function was called.
	 *
	 * @public
	 * @since 1.40.1
	 */
	// @override
	ODataListBinding.prototype.destroy = function () {
		this.oModel.bindingDestroyed(this);
		ListBinding.prototype.destroy.apply(this);
	};

	/*
	 * Delegates to {@link ListBinding#enableExtendedChangeDetection} while disallowing the vKey
	 * parameter.
	 */
	// @override
	ODataListBinding.prototype.enableExtendedChangeDetection = function (bDetectUpdates, vKey) {
		if (vKey !== undefined) {
			throw new Error("Unsupported property 'key' with value '" + vKey
				+ "' in binding info for " + this);
		}

		return ListBinding.prototype.enableExtendedChangeDetection.apply(this, arguments);
	};

	/**
	 * Requests the value for the given absolute path; the value is requested from this binding's
	 * cache or from its context in case it has no cache or the cache does not contain data for
	 * this path.
	 *
	 * @param {string} sPath
	 *   An absolute path including the binding path
	 * @returns {SyncPromise}
	 *   A promise on the outcome of the cache's <code>read</code> call
	 *
	 * @private
	 */
	ODataListBinding.prototype.fetchAbsoluteValue = function (sPath) {
		var iIndex, iPos, sResolvedPath;

		if (this.oCache) {
			sResolvedPath = this.oModel.resolve(this.sPath, this.oContext) + "/";
			if (sPath.lastIndexOf(sResolvedPath) === 0) {
				sPath = sPath.slice(sResolvedPath.length);
				iIndex = parseInt(sPath, 10); // parseInt ignores any path following the number
				iPos = sPath.indexOf("/");
				sPath = iPos > 0 ? sPath.slice(iPos + 1) : "";
				return this.fetchValue(sPath, undefined, iIndex);
			}
		}
		if (this.oContext) {
			return this.oContext.fetchAbsoluteValue(sPath);
		}
		return _SyncPromise.resolve();
	};

	/**
	 * Requests the value for the given path and index; the value is requested from this binding's
	 * cache or from its context in case it has no cache.
	 *
	 * @param {string} [sPath]
	 *   Some relative path
	 * @param {sap.ui.model.odata.v4.ODataPropertyBinding} [oListener]
	 *   A property binding which registers itself as listener at the cache
	 * @param {number} iIndex
	 *   Index corresponding to some current context of this binding
	 * @returns {SyncPromise}
	 *   A promise on the outcome of the cache's <code>read</code> call
	 *
	 * @private
	 */
	ODataListBinding.prototype.fetchValue = function (sPath, oListener, iIndex) {
		if (this.oCache) {
			return this.oCache.read(iIndex, /*iLength*/1, undefined, sPath, undefined, oListener);
		}
		if (this.oContext) {
			return this.oContext.fetchValue(_Helper.buildPath(this.sPath, iIndex, sPath),
				oListener);
		}
		return _SyncPromise.resolve();
	};

	/**
	 * Filters the list with the given filters.
	 *
	 * If there are pending changes an error is thrown. Use {@link #hasPendingChanges} to check if
	 * there are pending changes. If there are changes, call
	 * {@link sap.ui.model.odata.v4.ODataModel#submitBatch} to submit the changes or
	 * {@link sap.ui.model.odata.v4.ODataModel#resetChanges} to reset the changes before calling
	 * 'filter'.
	 *
	 * @param {sap.ui.model.Filter|sap.ui.model.Filter[]} [vFilters]
	 *   The dynamic filters to be used; replaces the dynamic filters given in
	 *   {@link sap.ui.model.odata.v4.ODataModel#bindList}.
	 *   The filter executed on the list is created from the following parts, which are combined
	 *   with a logical 'and':
	 *   <ul>
	 *   <li> Dynamic filters of type sap.ui.model.FilterType.Application
	 *   <li> Dynamic filters of type sap.ui.model.FilterType.Control
	 *   <li> The static filters, as defined in the '$filter' binding parameter
	 *   </ul>
	 *
	 * @param {sap.ui.model.FilterType} [sFilterType=sap.ui.model.FilterType.Application]
	 *   The filter type to be used
	 * @returns {sap.ui.model.odata.v4.ODataListBinding}
	 *   <code>this</code> to facilitate method chaining
	 * @throws {Error}
	 *   If there are pending changes or if an unsupported operation mode is used (see
	 *   {@link sap.ui.model.odata.v4.ODataModel#bindList})
	 *
	 * @public
	 * @see sap.ui.model.ListBinding#filter
	 * @since 1.39.0
	 */
	ODataListBinding.prototype.filter = function (vFilters, sFilterType) {
		if (this.sOperationMode !== OperationMode.Server) {
			throw new Error("Operation mode has to be sap.ui.model.odata.OperationMode.Server");
		}
		if (this.hasPendingChanges()) {
			throw new Error("Cannot filter due to pending changes");
		}

		if (sFilterType === FilterType.Control) {
			this.aFilters = _ODataHelper.toArray(vFilters);
		} else {
			this.aApplicationFilters = _ODataHelper.toArray(vFilters);
		}
		this.mCacheByContext = undefined;
		this.oCache = _ODataHelper.createListCacheProxy(this, this.oContext);
		this.sChangeReason = ChangeReason.Filter;
		this.reset();
		this._fireRefresh({reason : ChangeReason.Filter});

		return this;
	};

	 /**
	 * Returns already created binding contexts for all entities in this list binding for the range
	 * determined by the given start index <code>iStart</code> and <code>iLength</code>.
	 * If at least one of the entities in the given range has not yet been loaded, fires a
	 * {@link sap.ui.model.Binding#attachChange 'change'} event on this list binding once these
	 * entities have been loaded <b>asynchronously</b>. A further call to this method in the
	 * 'change' event handler with the same index range then yields the updated array of contexts.
	 *
	 * @param {number} [iStart=0]
	 *   The index where to start the retrieval of contexts
	 * @param {number} [iLength]
	 *   The number of contexts to retrieve beginning from the start index; defaults to the model's
	 *   size limit, see {@link sap.ui.model.Model#setSizeLimit}
	 * @param {number} [iMaximumPrefetchSize=0]
	 *   The maximum number of contexts to read before and after the given range; with this,
	 *   controls can prefetch data that is likely to be needed soon, e.g. when scrolling down in a
	 *   table. Negative values will be treated as 0.
	 *   Supported since 1.39.0
	 * @returns {sap.ui.model.odata.v4.Context[]}
	 *   The array of already created contexts with the first entry containing the context for
	 *   <code>iStart</code>
	 * @throws {Error}
	 *   If <code>iMaximumPrefetchSize</code> is set and extended change detection is enabled (see
	 *   {@link ListBinding#enableExtendedChangeDetection})
	 *
	 * @protected
	 * @see sap.ui.model.ListBinding#getContexts
	 * @since 1.37.0
	 */
	ODataListBinding.prototype.getContexts = function (iStart, iLength, iMaximumPrefetchSize) {
		var sChangeReason,
			oContext = this.oContext,
			aContexts,
			bDataRequested = false,
			sGroupId,
			oPromise,
			oRange,
			that = this;

		if (iMaximumPrefetchSize !== undefined && this.bUseExtendedChangeDetection) {
			throw new Error("Unsupported operation: v4.ODataListBinding#getContexts,"
					+ " third parameter must not be set if extended change detection is enabled");
		}

		if (this.bRelative && !oContext) { // unresolved relative binding
			return [];
		}

		sChangeReason = this.sChangeReason || ChangeReason.Change;
		this.sChangeReason = undefined;

		iStart = iStart || 0;
		iLength = iLength || this.oModel.iSizeLimit;
		if (!iMaximumPrefetchSize || iMaximumPrefetchSize < 0) {
			iMaximumPrefetchSize = 0;
		}

		oRange = _ODataHelper.getReadRange(this.aContexts, iStart, iLength, iMaximumPrefetchSize,
			this.iMaxLength);

		if (oRange) {
			if (this.oCache) {
				sGroupId = this.sRefreshGroupId || this.getGroupId();
				this.sRefreshGroupId = undefined;
				oPromise = this.oCache.read(oRange.start, oRange.length, sGroupId, undefined,
					function () {
						bDataRequested = true;
						that.oModel.addedRequestToGroup(sGroupId,
							that.fireDataRequested.bind(that));
				});
			} else {
				oPromise = oContext.fetchValue(this.sPath);
			}
			oPromise.then(function (vResult) {
				var aResult,
					iResultLength;

				// ensure that the result is still relevant
				if (!that.bRelative || that.oContext === oContext) {
					aResult = vResult && (Array.isArray(vResult) ? vResult : vResult.value);
					iResultLength = aResult ? aResult.length : 0;
					if (that.bUseExtendedChangeDetection) {
						return _ODataHelper.requestDiff(that, aResult, iStart, iLength)
							.then(function (aDiff) {
								that.aDiff = aDiff;
								that.createContexts(oRange, iResultLength, sChangeReason,
									bDataRequested);
							});
					} else {
						that.createContexts(oRange, iResultLength, sChangeReason, bDataRequested);
					}
				} else if (bDataRequested) { // fire dataReceived if not done in createContexts
					that.fireDataReceived(); // no try catch needed: uncaught in promise
				}
			}, function (oError) {
				// cache shares promises for concurrent read
				if (bDataRequested) {
					if (oError.canceled) {
						that.fireDataReceived();
					} else {
						that.oModel.reportError("Failed to get contexts for "
								+ that.oModel.sServiceUrl
								+ that.oModel.resolve(that.sPath, that.oContext).slice(1)
								+ " with start index " + iStart + " and length " + iLength,
							sClassName, oError);
						that.fireDataReceived({error : oError});
					}
				}
			})["catch"](function (oError) {
				jQuery.sap.log.error(oError.message, oError.stack, sClassName);
			});
		}
		this.iCurrentBegin = iStart;
		this.iCurrentEnd = iStart + iLength;
		aContexts = this.aContexts.slice(iStart, iStart + iLength);
		if (this.bUseExtendedChangeDetection) {
			aContexts.dataRequested = !!oRange;
			aContexts.diff = aContexts.dataRequested ? [] : this.aDiff;
			this.aDiff = [];
		}
		if (sChangeReason === ChangeReason.Refresh) {
			this.oModel.getDependentBindings(this).forEach(function (oDependentBinding) {
				oDependentBinding.checkUpdate();
			});
		}
		return aContexts;
	};

	/**
	 * Returns the contexts that were requested by a control last time. Does not trigger a
	 * data request. In the time between the {@link #event:dataRequested dataRequested} event and
	 * the {@link #event:dataReceived dataReceived} event, the resulting array contains
	 * <code>undefined</code> at those indexes where the data is not yet available.
	 *
	 * @returns {sap.ui.model.odata.v4.Context[]}
	 *   The contexts
	 *
	 * @public
	 * @see sap.ui.model.ListBinding#getCurrentContexts
	 * @since 1.39.0
	 */
	// @override
	ODataListBinding.prototype.getCurrentContexts = function () {
		var aContexts = this.aContexts.slice(this.iCurrentBegin, this.iCurrentEnd),
			iLength = Math.min(this.iCurrentEnd, this.iMaxLength) - this.iCurrentBegin;

		while (aContexts.length < iLength) {
			aContexts.push(undefined);
		}
		return aContexts;
	};

	/**
	 * Method not supported
	 *
	 * @throws {Error}
	 *
	 * @public
	 * @see sap.ui.model.ListBinding#getDistinctValues
	 * @since 1.37.0
	 */
	// @override
	ODataListBinding.prototype.getDistinctValues = function () {
		throw new Error("Unsupported operation: v4.ODataListBinding#getDistinctValues");
	};

	/**
	 * Returns the group ID of the binding that is used for read requests.
	 *
	 * @returns {string}
	 *   The group ID
	 *
	 * @private
	 */
	ODataListBinding.prototype.getGroupId = function () {
		return this.sGroupId || (this.bRelative && this.oContext && this.oContext.getGroupId())
			|| this.oModel.getGroupId();
	};

	/**
	 * Returns the number of entries in the list. As long as the client does not know the size on
	 * the server an estimated length is returned.
	 *
	 * @returns {number}
	 *   The number of entries in the list
	 *
	 * @public
	 * @see sap.ui.model.ListBinding#getLength
	 * @since 1.37.0
	 */
	 // @override
	ODataListBinding.prototype.getLength = function () {
		return this.bLengthFinal ? this.aContexts.length : this.aContexts.length + 10;
	};

	/**
	 * Returns the group ID of the binding that is used for update requests.
	 *
	 * @returns {string}
	 *   The update group ID
	 *
	 * @private
	 */
	ODataListBinding.prototype.getUpdateGroupId = function () {
		return this.sUpdateGroupId
			|| (this.bRelative && this.oContext && this.oContext.getUpdateGroupId())
			|| this.oModel.getUpdateGroupId();
	};

	/**
	 * Returns <code>true</code> if the binding has pending changes, meaning updates via two-way
	 * binding that have not yet been sent to the server.
	 *
	 * @returns {boolean}
	 *   <code>true</code> if the binding has pending changes
	 *
	 * @public
	 * @since 1.39.0
	 */
	ODataListBinding.prototype.hasPendingChanges = function () {
		return _ODataHelper.hasPendingChanges(this, true);
	};

	/**
	 * Initializes the OData list binding. Fires a 'change' event in case the binding has a
	 * resolved path.
	 *
	 * @protected
	 * @see sap.ui.model.Binding#initialize
	 * @since 1.37.0
	 */
	// @override
	ODataListBinding.prototype.initialize = function () {
		if (!this.bRelative || this.oContext) {
			this._fireChange({reason : ChangeReason.Change});
		}
	};

	/**
	 * Method not supported
	 *
	 * @throws {Error}
	 *
	 * @public
	 * @see sap.ui.model.Binding#isInitial
	 * @since 1.37.0
	 */
	// @override
	ODataListBinding.prototype.isInitial = function () {
		throw new Error("Unsupported operation: v4.ODataListBinding#isInitial");
	};

	/**
	 * Returns <code>true</code> if the length has been determined by the data returned from
	 * server. If the length is a client side estimation <code>false</code> is returned.
	 *
	 * @returns {boolean}
	 *   If <code>true</true> the length is determined by server side data
	 *
	 * @public
	 * @see sap.ui.model.ListBinding#isLengthFinal
	 * @since 1.37.0
	 */
	// @override
	ODataListBinding.prototype.isLengthFinal = function() {
		// some controls use .bLengthFinal on list binding instead of calling isLengthFinal
		return this.bLengthFinal;
	};

	/**
	 * Refreshes the binding. Prompts the model to retrieve data from the server using the given
	 * group ID and notifies the control that new data is available.
	 * Refresh is supported for absolute bindings.
	 *
	 * Note: When calling refresh multiple times, the result of the request triggered by the last
	 * call determines the binding's data; it is <b>independent</b>
	 * of the order of calls to {@link sap.ui.model.odata.v4.ODataModel#submitBatch} with the given
	 * group ID.
	 *
	 * @param {string} [sGroupId]
	 *   The group ID to be used for refresh; if not specified, the group ID for this binding is
	 *   used, see {@link sap.ui.model.odata.v4.ODataListBinding#constructor}.
	 *   Valid values are <code>undefined</code>, <code>'$auto'</code>, <code>'$direct'</code> or
	 *   application group IDs as specified in {@link sap.ui.model.odata.v4.ODataModel#submitBatch}.
	 * @throws {Error}
	 *   If the given group ID is invalid, the binding has pending changes via two-way binding or
	 *   refresh on this binding is not supported.
	 *
	 * @public
	 * @see sap.ui.model.Binding#refresh
	 * @see #hasPendingChanges
	 * @see #resetChanges
	 * @since 1.37.0
	 */
	// @override
	ODataListBinding.prototype.refresh = function (sGroupId) {
		if (this.bRelative) {
			throw new Error("Refresh on this binding is not supported");
		}
		if (this.hasPendingChanges()) {
			throw new Error("Cannot refresh due to pending changes");
		}
		_ODataHelper.checkGroupId(sGroupId);

		this.refreshInternal(sGroupId);
	};

	/**
	 * Refreshes the binding. The refresh method itself only performs some validation checks and
	 * forwards to this method doing the actual work. Interaction between contexts also runs via
	 * these internal methods.
	 *
	 * @param {string} [sGroupId]
	 *   The group ID to be used for refresh
	 *
	 * @private
	 */
	ODataListBinding.prototype.refreshInternal = function (sGroupId) {
		this.sRefreshGroupId = sGroupId;
		if (this.oCache) {
			if (this.bRelative) {
				this.oCache.deregisterChange();
				this.oCache = _ODataHelper.createListCacheProxy(this, this.oContext);
				this.mCacheByContext = undefined;
			} else {
				this.oCache.refresh();
			}
		}
		this.reset();
		this.sChangeReason = ChangeReason.Refresh;
		this._fireRefresh({reason : ChangeReason.Refresh});
		this.oModel.getDependentBindings(this).forEach(function (oDependentBinding) {
			if (oDependentBinding.refreshInternal) {
				oDependentBinding.refreshInternal(sGroupId);
			}
		});
	};

	/**
	 * Resets the binding's contexts array and its members related to current contexts and length
	 * calculation.
	 *
	 * @private
	 */
	ODataListBinding.prototype.reset = function () {
		this.aContexts = [];
		// the range for getCurrentContexts
		this.iCurrentBegin = this.iCurrentEnd = 0;
		// upper boundary for server-side list length (based on observations so far)
		this.iMaxLength = Infinity;
		// this.bLengthFinal = this.aContexts.length === this.iMaxLength
		this.bLengthFinal = false;
	};

	/**
	 * Resets all pending property changes of this binding, meaning updates via two-way binding that
	 * have not yet been sent to the server.
	 *
	 * @public
	 * @since 1.40.1
	 */
	ODataListBinding.prototype.resetChanges = function () {
		_ODataHelper.resetChanges(this, true);
	};

	/**
	 * Method not supported
	 *
	 * @throws {Error}
	 *
	 * @public
	 * @see sap.ui.model.Binding#resume
	 * @since 1.37.0
	 */
	// @override
	ODataListBinding.prototype.resume = function () {
		throw new Error("Unsupported operation: v4.ODataListBinding#resume");
	};

	/**
	 * Sets the context and resets the cached contexts of the list items.
	 *
	 * @param {sap.ui.model.odata.v4.Context} oContext
	 *   The context object
	 *
	 * @private
	 * @see sap.ui.model.Binding#setContext
	 */
	// @override
	ODataListBinding.prototype.setContext = function (oContext) {
		if (this.oContext !== oContext) {
			if (this.bRelative) {
				this.reset();
				if (this.oCache) {
					this.oCache.deregisterChange();
					this.oCache = undefined;
				}
				if (oContext) {
					this.oCache = _ODataHelper.createListCacheProxy(this, oContext);
				}
				// call Binding#setContext because of data state etc.; fires "change"
				Binding.prototype.setContext.call(this, oContext);
			} else {
				// remember context even if no "change" fired
				this.oContext = oContext;
			}
		}
	};

	/**
	 * Sort the entries represented by this list binding according to the given sorters.
	 * The sorters are stored at this list binding and they are used for each following data
	 * request.
	 *
	 * If there are pending changes an error is thrown. Use {@link #hasPendingChanges} to check if
	 * there are pending changes. If there are changes, call
	 * {@link sap.ui.model.odata.v4.ODataModel#submitBatch) to submit the changes or
	 * {@link sap.ui.model.odata.v4.ODataModel#resetChanges} to reset the changes before calling
	 * 'sort'.
	 *
	 * @param {sap.ui.model.Sorter | sap.ui.model.Sorter[]} [vSorters]
	 *   The dynamic sorters to be used; they replace the dynamic sorters given in
	 *   {@link sap.ui.model.odata.v4.ODataModel#bindList}.
	 *   Static sorters, as defined in the '$orderby' binding parameter, are always executed after
	 *   the dynamic sorters.
	 * @returns {sap.ui.model.odata.v4.ODataListBinding}
	 *   <code>this</code> to facilitate method chaining
	 * @throws {Error}
	 *   If there are pending changes or if an unsupported operation mode is used (see
	 *   {@link sap.ui.model.odata.v4.ODataModel#bindList}).
	 *
	 * @public
	 * @see sap.ui.model.ListBinding#sort
	 * @since 1.39.0
	 */
	ODataListBinding.prototype.sort = function (vSorters) {
		var sOrderby;

		if (this.sOperationMode !== OperationMode.Server) {
			throw new Error("Operation mode has to be sap.ui.model.odata.OperationMode.Server");
		}
		if (this.hasPendingChanges()) {
			throw new Error("Cannot sort due to pending changes");
		}
		// update aSorters to enable grouping
		this.aSorters = _ODataHelper.toArray(vSorters);

		// replace cache and reset contexts and length properties
		if (this.bRelative) {
			this.mCacheByContext = undefined;
			this.oCache = _ODataHelper.createListCacheProxy(this, this.oContext);
		} else {
			sOrderby = _ODataHelper.buildOrderbyOption(this.aSorters,
				this.mQueryOptions && this.mQueryOptions.$orderby);
			this.oCache = _Cache.create(this.oModel.oRequestor, this.sPath.slice(1),
				_ODataHelper.mergeQueryOptions(this.mQueryOptions, sOrderby));
		}
		this.reset();

		// store change reason for next change event
		this.sChangeReason = ChangeReason.Sort;
		this._fireRefresh({reason : ChangeReason.Sort});

		return this;
	};

	/**
	 * Method not supported
	 *
	 * @throws {Error}
	 *
	 * @public
	 * @see sap.ui.model.Binding#suspend
	 * @since 1.37.0
	 */
	// @override
	ODataListBinding.prototype.suspend = function () {
		throw new Error("Unsupported operation: v4.ODataListBinding#suspend");
	};

	/**
	 * Returns a string representation of this object including the binding path. If the binding is
	 * relative, the parent path is also given, separated by a '|'.
	 *
	 * @return {string} A string description of this binding
	 * @public
	 * @since 1.37.0
	 */
	ODataListBinding.prototype.toString = function () {
		return sClassName + ": " + (this.bRelative  ? this.oContext + "|" : "") + this.sPath;
	};

	/**
	 * Updates the value for the given property name inside the entity with the given relative path;
	 * the value is updated in this binding's cache or in its parent context in case it has no
	 * cache.
	 *
	 * @param {string} [sGroupId=getUpdateGroupId()]
	 *   The group ID to be used for this update call.
	 * @param {string} sPropertyName
	 *   Name of property to update
	 * @param {any} vValue
	 *   The new value
	 * @param {string} sEditUrl
	 *   The edit URL for the entity which is updated
	 * @param {string} sPath
	 *   Some relative path
	 * @returns {Promise}
	 *   A promise on the outcome of the cache's <code>update</code> call
	 *
	 * @private
	 */
	ODataListBinding.prototype.updateValue = function (sGroupId, sPropertyName, vValue, sEditUrl,
		sPath) {
		var oPromise;

		if (this.oCache) {
			sGroupId = sGroupId || this.getUpdateGroupId();
			oPromise = this.oCache.update(sGroupId, sPropertyName, vValue, sEditUrl, sPath);
			this.oModel.addedRequestToGroup(sGroupId);
			return oPromise;
		}

		return this.oContext.updateValue(sGroupId, sPropertyName, vValue, sEditUrl,
			_Helper.buildPath(this.sPath, sPath));
	};

	return ODataListBinding;
}, /* bExport= */ true);
