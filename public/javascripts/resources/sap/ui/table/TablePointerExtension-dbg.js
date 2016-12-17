/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2016 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides helper sap.ui.table.TablePointerExtension.
sap.ui.define(['jquery.sap.global', './TableExtension', './TableUtils', 'sap/ui/Device'],
	function(jQuery, TableExtension, TableUtils, Device) {
	"use strict";

	/*
	 * Provides utility functions used this extension
	 */
	var ExtensionHelper = {

		/*
		 * Returns the pageX and pageY position of the given mouse/touch event.
		 */
		_getEventPosition : function(oEvent, oTable) {
			var oPos;
			if (oTable._isTouchMode(oEvent)) {
				oPos = oEvent.targetTouches ? oEvent.targetTouches[0] : oEvent.originalEvent.targetTouches[0];
			} else {
				oPos = oEvent;
			}
			return {x: oPos.pageX, y: oPos.pageY};
		}

	};

	/*
	 * Provides helper functionality (e.g. drag&drop capabilities) for column resizing.
	 */
	var ColumnResizeHelper = {

		/*
		 * Initializes the drag&drop for resizing
		 */
		initColumnResizing : function(oTable, oEvent){
			if (oTable._bIsColumnResizerMoving) {
				return;
			}

			oTable._bIsColumnResizerMoving = true;
			oTable.$().toggleClass("sapUiTableResizing", true);

			var $Document = jQuery(document),
				bTouch = oTable._isTouchMode(oEvent);

			oTable._$colResize = oTable.$("rsz");
			oTable._iColumnResizeStart = ExtensionHelper._getEventPosition(oEvent, oTable).x;

			$Document.bind((bTouch ? "touchend" : "mouseup") + ".sapUiTableColumnResize", ColumnResizeHelper.exitColumnResizing.bind(oTable));
			$Document.bind((bTouch ? "touchmove" : "mousemove") + ".sapUiTableColumnResize", ColumnResizeHelper.onMouseMoveWhileColumnResizing.bind(oTable));

			oTable._disableTextSelection();
		},

		/*
		 * Drops the previous dragged column resize bar and recalculates the new column width.
		 */
		exitColumnResizing: function(oEvent) {
			ColumnResizeHelper._resizeColumn(this, this._iLastHoveredColumnIndex);
		},

		/*
		 * Handler for the move events while dragging the column resize bar.
		 */
		onMouseMoveWhileColumnResizing: function(oEvent) {
			var iLocationX = ExtensionHelper._getEventPosition(oEvent, this).x;

			if (this._iColumnResizeStart && iLocationX < this._iColumnResizeStart + 3 && iLocationX > this._iColumnResizeStart - 3) {
				return;
			}

			if (this._isTouchMode(oEvent)) {
				oEvent.stopPropagation();
				oEvent.preventDefault();
			}

			this._$colResize.toggleClass("sapUiTableColRszActive", true);

			var oColumn = this._getVisibleColumns()[this._iLastHoveredColumnIndex];
			var iDeltaX = iLocationX - this._iColumnResizeStart;
			var iWidth = Math.max(oColumn.$().width() + iDeltaX * (this._bRtlMode ? -1 : 1), this._iColMinWidth);

			// calculate and set the position of the resize handle
			var iRszOffsetLeft = this.$().find(".sapUiTableCnt").offset().left;
			var iRszLeft = Math.floor((iLocationX - iRszOffsetLeft) - (this._$colResize.width() / 2));
			this._$colResize.css("left", iRszLeft + "px");

			// store the width of the column to apply later
			oColumn._iNewWidth = iWidth;
		},

		/*
		 * Cleans up the state which is created while resize a column via drag&drop.
		 */
		_cleanupColumResizing: function(oTable) {
			if (oTable._$colResize) {
				oTable._$colResize.toggleClass("sapUiTableColRszActive", false);
				oTable._$colResize = null;
			}
			oTable._iColumnResizeStart = null;
			oTable._bIsColumnResizerMoving = false;
			oTable.$().toggleClass("sapUiTableResizing", false);
			oTable._enableTextSelection();

			var $Document = jQuery(document);
			$Document.unbind("touchmove.sapUiTableColumnResize");
			$Document.unbind("touchend.sapUiTableColumnResize");
			$Document.unbind("mousemove.sapUiTableColumnResize");
			$Document.unbind("mouseup.sapUiTableColumnResize");
		},

		/*
		 * Cleans up the state which is created while resize a column via drag&drop and recalculates the new column width.
		 */
		_resizeColumn: function(oTable, iColIndex) {
			var aVisibleColumns = oTable._getVisibleColumns(),
				oColumn,
				bResized = false;

			if (iColIndex >= 0 && iColIndex < aVisibleColumns.length) {
				oColumn = aVisibleColumns[iColIndex];
				if (oColumn._iNewWidth) {
					var sWidth;
					var iAvailableSpace = oTable.$().find(".sapUiTableCtrl").width();
					if (!oTable._checkPercentageColumnWidth()) {
						sWidth = oColumn._iNewWidth + "px";
					} else {
						var iColumnWidth = Math.round(100 / iAvailableSpace * oColumn._iNewWidth);
						sWidth = iColumnWidth + "%";
					}

					if (oTable._updateColumnWidth(oColumn, sWidth, true)) {
						oTable._resizeDependentColumns(oColumn, sWidth);
					}

					delete oColumn._iNewWidth;
					bResized = true;
				}
			}

			ColumnResizeHelper._cleanupColumResizing(oTable);

			oColumn.focus();

			// rerender if size of the column was changed
			if (bResized) {
				oTable.invalidate();
			}
		},

		/*
		 * Computes the optimal width for a column and changes the width if the auto resize feature is activated for the column.
		 *
		 * Experimental feature.
		 */
		doAutoResizeColumn : function(oTable, iColIndex) {
			var aVisibleColumns = oTable._getVisibleColumns(),
				oColumn;

			if (iColIndex >= 0 && iColIndex < aVisibleColumns.length) {
				oColumn = aVisibleColumns[iColIndex];
				if (!oColumn.getAutoResizable() || !oColumn.getResizable()) {
					return;
				}

				var iNewWidth = ColumnResizeHelper._calculateAutomaticColumnWidth.apply(oTable, [oColumn, iColIndex]);
				if (iNewWidth) {
					oColumn._iNewWidth = iNewWidth;
					ColumnResizeHelper._resizeColumn(oTable, iColIndex);
				}
			}
		},

		/*
		 * Calculates the widest content width of the column
		 * also takes the column header and potential icons into account
		 * @param {int} iColIndex index of the column which should be resized
		 * @return {int} minWidth minimum width the column needs to have
		 *
		 * Note: Experimental, only works with a limited control set
		 *
		 * TBD: Cleanup this function and find a proper mechanismn
		 */
		_calculateAutomaticColumnWidth : function(oCol, iColIndex) {
			function checkIsTextControl(oControl) {
				var aTextBasedControls = [
					"sap/m/Text",
					"sap/m/Label",
					"sap/m/Link",
					"sap/m/Input",
					"sap/ui/commons/TextView",
					"sap/ui/commons/Label",
					"sap/ui/commons/Link",
					"sap/ui/commons/TextField"
				];
				var bIsTextBased = false;
				for (var i = 0; i < aTextBasedControls.length; i++) {
					bIsTextBased = bIsTextBased || TableUtils.isInstanceOf(oControl, aTextBasedControls[i]);
				}
				if (!bIsTextBased && typeof TablePointerExtension._fnCheckTextBasedControl === "function" && TablePointerExtension._fnCheckTextBasedControl(oControl)) {
					bIsTextBased = true;
				}
				return bIsTextBased;
			}

			var $this = this.$();
			var iHeaderWidth = 0;
			var $cols = $this.find('td[headers=\"' + this.getId() + '_col' + iColIndex + '\"]').children("div");
			var aHeaderSpan = oCol.getHeaderSpan();
			var oColLabel = oCol.getLabel();
			var oColTemplate = oCol.getTemplate();
			var bIsTextBased = checkIsTextControl(oColTemplate);

			var hiddenSizeDetector = document.createElement("div");
			document.body.appendChild(hiddenSizeDetector);
			jQuery(hiddenSizeDetector).addClass("sapUiTableHiddenSizeDetector");

			var oColLabels = oCol.getMultiLabels();
			if (oColLabels.length == 0 && !!oColLabel){
				oColLabels = [oColLabel];
			}

			if (oColLabels.length > 0) {
				jQuery.each(oColLabels, function(iIdx, oLabel){
					var iHeaderSpan;
					if (!!oLabel.getText()){
						jQuery(hiddenSizeDetector).text(oLabel.getText());
						iHeaderWidth = hiddenSizeDetector.scrollWidth;
					} else {
						iHeaderWidth = oLabel.$().scrollWidth;
					}
					iHeaderWidth = iHeaderWidth + $this.find("#" + oCol.getId() + "-icons").first().width();

					$this.find(".sapUiTableColIcons#" + oCol.getId() + "_" + iIdx + "-icons").first().width();
					if (aHeaderSpan instanceof Array && aHeaderSpan[iIdx] > 1){
						iHeaderSpan = aHeaderSpan[iIdx];
					} else if (aHeaderSpan > 1){
						iHeaderSpan = aHeaderSpan;
					}
					if (!!iHeaderSpan){
						// we have a header span, so we need to distribute the width of this header label over more than one column
						//get the width of the other columns and subtract from the minwidth required from label side
						var i = iHeaderSpan - 1;
						while (i > iColIndex) {
							iHeaderWidth = iHeaderWidth - (this._getVisibleColumns()[iColIndex + i].$().width() || 0);
							i -= 1;
						}
					}
				});
			}

			var minAddWidth = Math.max.apply(null, $cols.map(
				function(){
					var _$this = jQuery(this);
					return parseInt(_$this.css('padding-left'), 10) + parseInt(_$this.css('padding-right'), 10)
							+ parseInt(_$this.css('margin-left'), 10) + parseInt(_$this.css('margin-right'), 10);
				}).get());

			//get the max width of the currently displayed cells in this column
			var minWidth = Math.max.apply(null, $cols.children().map(
				function() {
					var width = 0,
					sWidth = 0;
					var _$this = jQuery(this);
					var sColText = _$this.text() || _$this.val();

					if (bIsTextBased){
						jQuery(hiddenSizeDetector).text(sColText);
						sWidth = hiddenSizeDetector.scrollWidth;
					} else {
						sWidth = this.scrollWidth;
					}
					if (iHeaderWidth > sWidth){
						sWidth = iHeaderWidth;
					}
					width = sWidth + parseInt(_$this.css('margin-left'), 10)
											+ parseInt(_$this.css('margin-right'), 10)
											+ minAddWidth
											+ 1; // ellipsis is still displayed if there is an equality of the div's width and the table column
					return width;
				}).get());

			jQuery(hiddenSizeDetector).remove();
			return Math.max(minWidth, this._iColMinWidth);
		},

		/*
		 * Initialize the event listener for positioning the column resize bar and computing the currently hovered column.
		 */
		initColumnTracking : function(oTable) {
			// attach mousemove listener to update resizer position
			oTable.$().find(".sapUiTableCtrlScr, .sapUiTableCtrlScrFixed, .sapUiTableColHdrScr, .sapUiTableColHdrFixed").mousemove(function(oEvent){
				var oDomRef = this.getDomRef();
				if (!oDomRef || this._bIsColumnResizerMoving) {
					return;
				}

				var iPositionX = oEvent.clientX,
					iTableRect = oDomRef.getBoundingClientRect(),
					iLastHoveredColumn = 0,
					iResizerPositionX = this._bRtlMode ? 10000 : -10000;

				for (var i = 0; i < this._aTableHeaders.length; i++) {
					var oTableHeaderRect = this._aTableHeaders[i].getBoundingClientRect();
					if (this._bRtlMode) {
						// 5px for resizer width
						if (iPositionX < oTableHeaderRect.right - 5) {
							iLastHoveredColumn = i;
							iResizerPositionX = oTableHeaderRect.left - iTableRect.left;
						}
					} else {
						// 5px for resizer width
						if (iPositionX > oTableHeaderRect.left + 5) {
							iLastHoveredColumn = i;
							iResizerPositionX = oTableHeaderRect.right - iTableRect.left;
						}
					}
				}

				var oColumn = this._getVisibleColumns()[iLastHoveredColumn];
				if (oColumn && oColumn.getResizable()) {
					this.$("rsz").css("left", iResizerPositionX + "px");
					this._iLastHoveredColumnIndex = iLastHoveredColumn;
				}
			}.bind(oTable));
		}

	};



	/*
	 * Provides drag&drop resize capabilities for visibleRowCountMode "Interactive".
	 */
	var InteractiveResizeHelper = {

		/*
		 * Initializes the drag&drop for resizing
		 */
		initInteractiveResizing: function(oTable, oEvent){
			var $Body = jQuery(document.body),
				$Splitter = oTable.$("sb"),
				$Document = jQuery(document),
				offset = $Splitter.offset(),
				height = $Splitter.height(),
				width = $Splitter.width(),
				bTouch = oTable._isTouchMode(oEvent);

			// Fix for IE text selection while dragging
			$Body.bind("selectstart", InteractiveResizeHelper.onSelectStartWhileInteractiveResizing);

			$Body.append(
				"<div id=\"" + oTable.getId() + "-ghost\" class=\"sapUiTableInteractiveResizerGhost\" style =\" height:" + height + "px; width:"
				+ width + "px; left:" + offset.left + "px; top:" + offset.top + "px\" ></div>");

			// Append overlay over splitter to enable correct functionality of moving the splitter
			$Splitter.append("<div id=\"" + oTable.getId() + "-rzoverlay\" style =\"left: 0px; right: 0px; bottom: 0px; top: 0px; position:absolute\" ></div>");

			$Document.bind((bTouch ? "touchend" : "mouseup") + ".sapUiTableInteractiveResize", InteractiveResizeHelper.exitInteractiveResizing.bind(oTable));
			$Document.bind((bTouch ? "touchmove" : "mousemove") + ".sapUiTableInteractiveResize", InteractiveResizeHelper.onMouseMoveWhileInteractiveResizing.bind(oTable));

			oTable._disableTextSelection();
		},

		/*
		 * Drops the previous dragged horizontal splitter bar and recalculates the amount of rows to be displayed.
		 */
		exitInteractiveResizing : function(oEvent) {
			var $Body = jQuery(document.body),
				$Document = jQuery(document),
				$This = this.$(),
				$Ghost = this.$("ghost"),
				iLocationY = ExtensionHelper._getEventPosition(oEvent, this).y;

			var iNewHeight = iLocationY - $This.find(".sapUiTableCCnt").offset().top - $Ghost.height() - $This.find(".sapUiTableFtr").height();

			// TBD: Move this to the table code
			this._setRowContentHeight(iNewHeight);
			this._adjustRows(this._calculateRowsToDisplay(iNewHeight));

			$Ghost.remove();
			this.$("rzoverlay").remove();

			$Body.unbind("selectstart", InteractiveResizeHelper.onSelectStartWhileInteractiveResizing);
			$Document.unbind("touchend.sapUiTableInteractiveResize");
			$Document.unbind("touchmove.sapUiTableInteractiveResize");
			$Document.unbind("mouseup.sapUiTableInteractiveResize");
			$Document.unbind("mousemove.sapUiTableInteractiveResize");

			this._enableTextSelection();
		},

		/*
		 * Handler for the selectstart event triggered in IE to select the text. Avoid this during resize drag&drop.
		 */
		onSelectStartWhileInteractiveResizing : function(oEvent) {
			oEvent.preventDefault();
			oEvent.stopPropagation();
			return false;
		},

		/*
		 * Handler for the move events while dragging the horizontal resize bar.
		 */
		onMouseMoveWhileInteractiveResizing : function(oEvent) {
			var iLocationY = ExtensionHelper._getEventPosition(oEvent, this).y;
			var iMin = this.$().offset().top;
			if (iLocationY > iMin) {
				this.$("ghost").css("top", iLocationY + "px");
			}
		}

	};



	/*
	 * Provides drag&drop capabilities for column reordering.
	 */
	var ReorderHelper = {

		/*
		 * Initializes the drag&drop for reordering
		 */
		initReordering: function(oTable, iColIndex, oEvent) {
			var bTouch = oTable._isTouchMode(oEvent),
				oColumn = oTable.getColumns()[iColIndex],
				$Col = oColumn.$(),
				$Table = oTable.$();

			oTable._disableTextSelection();
			$Table.addClass("sapUiTableDragDrop");
			oTable._$ColGhost = $Col.clone().removeAttr("id");
			$Col.css({"opacity" : ".25"});

			oTable._$ColGhost.addClass("sapUiTableColGhost").css({
				"left": -10000,
				"top": -10000,
				//Position is set to relative for columns later, if the moving is started a second time the position: relative overwrites
				//the absolut position set by the sapUiTableColGhost class, so we overrite the style attribute for position here to make
				//sure that the position is absolute
				"position": "absolute",
				"z-index": oTable.$().zIndex() + 10
			});

			// TODO: only for the visible columns!?
			$Table.find(".sapUiTableCol").each(function(iIndex, oElement) {

				var _$Col = jQuery(this),
					oPos = this.getBoundingClientRect(),
					iWidth = _$Col.outerWidth();

				_$Col.css({position: "relative"});
				_$Col.data("pos", {
					left : oPos.left,
					center : oPos.left + iWidth / 2,
					right :  oPos.left + iWidth
				});

			});

			oTable._$ColGhost.appendTo(document.body);

			var $Document = jQuery(document);
			$Document.bind((bTouch ? "touchend" : "mouseup") + ".sapUiColumnMove", ReorderHelper.exitReordering.bind(oTable));
			$Document.bind((bTouch ? "touchmove" : "mousemove") + ".sapUiColumnMove", ReorderHelper.onMouseMoveWhileReordering.bind(oTable));
		},

		/*
		 * Handler for the move events while dragging for reordering.
		 * Reposition the ghost.
		 */
		onMouseMoveWhileReordering : function(oEvent) {
			var $This = this.$();
			var oLocation = ExtensionHelper._getEventPosition(oEvent, this);
			var iLocationX = oLocation.x;
			var iLocationY = oLocation.y;
			var bRtl = this._bRtlMode;
			var iDnDColIndex = parseInt(this._$ColGhost.attr("data-sap-ui-colindex"), 10);
			var $DnDCol = this.getColumns()[iDnDColIndex].$();

			// find out the new col position
			var iOldColPos = this._iNewColPos;
			this._iNewColPos = iDnDColIndex;
			var that = this;
			$This.find(".sapUiTableCol").each(function(iIndex, oCol) {
				var $col = jQuery(oCol);
				var iColIndex = parseInt($col.attr("data-sap-ui-colindex"), 10);
				var iSpan = ReorderHelper.getHeaderSpan(sap.ui.getCore().byId($col.attr("data-sap-ui-colid")));

				if ($col.get(0) !== $DnDCol.get(0)) {

					var oPos = $col.data("pos");

					var bBefore = iLocationX >= oPos.left && iLocationX <= oPos.center;
					var bAfter = iLocationX >= oPos.center && iLocationX <= oPos.right;

					if (!bRtl && bBefore || bRtl && bAfter) {
						that._iNewColPos = iColIndex;
					} else if (!bRtl && bAfter || bRtl && bBefore) {
						that._iNewColPos = iColIndex + iSpan;
					} else {
						that._iNewColPos = that._iNewColPos;
					}

					if ((bBefore || bAfter) && iColIndex > iDnDColIndex) {
						that._iNewColPos--;
					}

				}

			});

			// prevent the reordering of the fixed columns
			if (!ReorderHelper.isColumnReorderable(this, this._iNewColPos)) {
				this._iNewColPos = iOldColPos;
			}

			// animate the column move
			ReorderHelper.animateColumnMove(this, iDnDColIndex, iOldColPos, this._iNewColPos);

			// update the ghost position
			this._$ColGhost.css({
				"left": iLocationX + 5,
				"top": iLocationY + 5
			});
		},

		/*
		 * Ends the column reordering process via drag&drop.
		 */
		exitReordering : function(oEvent) {
			var that = this;
			this.$().removeClass("sapUiTableDragDrop");

			var iDnDColIndex = parseInt(this._$ColGhost.attr("data-sap-ui-colindex"), 10);
			var oDnDCol = this.getColumns()[iDnDColIndex];

			var $Document = jQuery(document);
			$Document.unbind("touchmove.sapUiColumnMove");
			$Document.unbind("touchend.sapUiColumnMove");
			$Document.unbind("mousemove.sapUiColumnMove");
			$Document.unbind("mouseup.sapUiColumnMove");

			this._$ColGhost.remove();
			this._$ColGhost = undefined;

			this._enableTextSelection();

			// forward the event
			var bExecuteDefault = this.fireColumnMove({
				column: oDnDCol,
				newPos: this._iNewColPos
			});

			var bMoveRight = iDnDColIndex < this._iNewColPos;

			if (bExecuteDefault && this._iNewColPos !== undefined && this._iNewColPos !== iDnDColIndex) {
				this.removeColumn(oDnDCol);
				this.insertColumn(oDnDCol, this._iNewColPos);
				var iSpan = ReorderHelper.getHeaderSpan(oDnDCol);

				if (iSpan > 1) {
					if (!bMoveRight) {
						this._iNewColPos++;
					}
					for (var i = 1; i < iSpan; i++) {
						var oDependentCol = this.getColumns()[bMoveRight ? iDnDColIndex : iDnDColIndex + i];
						this.removeColumn(oDependentCol);
						this.insertColumn(oDependentCol, this._iNewColPos);
						this.fireColumnMove({
							column: oDependentCol,
							newPos: this._iNewColPos
						});
						if (!bMoveRight) {
							this._iNewColPos++;
						}
					}
				}
			} else {
				ReorderHelper.animateColumnMove(this, iDnDColIndex, this._iNewColPos, iDnDColIndex);
				oDnDCol.$().css({
					"backgroundColor": "",
					"backgroundImage": "",
					"opacity": ""
				});
			}

			// Re-apply focus
			if (this._mTimeouts.reApplyFocusTimer) {
				window.clearTimeout(this._mTimeouts.reApplyFocusTimer);
			}
			this._mTimeouts.reApplyFocusTimer = window.setTimeout(function() {
				var iOldFocusedIndex = TableUtils.getFocusedItemInfo(that).cell;
				TableUtils.focusItem(that, 0, oEvent);
				TableUtils.focusItem(that, iOldFocusedIndex, oEvent);
			}, 0);

			delete this._iNewColPos;

			// For AnalyticalTable only
			if (this.updateAnalyticalInfo) {
				this.updateAnalyticalInfo(true, true);
			}
		},

		/*
		 * Animates the column movement during the column reordering process via drag&drop.
		 */
		animateColumnMove : function(oTable, iColIndex, iOldPos, iNewPos) {
			var bRtl = oTable._bRtlMode;
			var $DnDCol = oTable.getColumns()[iColIndex].$();

			// position has been changed => reorder
			if (iOldPos !== iNewPos) {

				for (var i = Math.min(iOldPos, iNewPos), l = Math.max(iOldPos, iNewPos); i <= l; i++) {
					var oCol = oTable.getColumns()[i];
					if (i !== iColIndex && oCol.getVisible()) {
						oCol.$().stop(true, true).animate({left: "0px"});
					}
				}

				var iOffsetLeft = 0;
				if (iNewPos < iColIndex) {
					for (var i = iNewPos; i < iColIndex; i++) {
						var oCol = oTable.getColumns()[i];
						if (oCol.getVisible()) {
							var $col = oCol.$();
							iOffsetLeft -= $col.outerWidth();
							$col.stop(true, true).animate({left: $DnDCol.outerWidth() * (bRtl ? -1 : 1) + "px"});
						}
					}
				} else {
					for (var i = iColIndex + 1, l = iNewPos + 1; i < l; i++) {
						var oCol = oTable.getColumns()[i];
						if (oCol.getVisible()) {
							var $col = oCol.$();
							iOffsetLeft += $col.outerWidth();
							$col.stop(true, true).animate({left: $DnDCol.outerWidth() * (bRtl ? 1 : -1) + "px"});
						}
					}
				}
				$DnDCol.stop(true, true).animate({left: iOffsetLeft * (bRtl ? -1 : 1) + "px"});
			}
		},

		/*
		 * Computes the header span of the given column.
		 */
		getHeaderSpan : function(oColumn) {
			var vHeaderSpan = oColumn.getHeaderSpan(),
				iSpan = 1;

			if (vHeaderSpan) {
				iSpan = jQuery.isArray(vHeaderSpan) ? vHeaderSpan[0] : vHeaderSpan;
			}

			return iSpan;
		},

		/*
		 * Checks whether the column with the given index can be reordered.
		 */
		isColumnReorderable: function(oTable, iIndex) {
			if (iIndex < oTable.getFixedColumnCount() || iIndex < oTable._iFirstReorderableIndex) {
				return false;
			}
			return true;
		}

	};



	/*
	 * Event handling of touch and mouse events.
	 * "this" in the function context is the table instance.
	 */
	var ExtensionDelegate = {

		onmousedown : function(oEvent) {
			// check whether item navigation should be reapplied from scratch
			this._getKeyboardExtension().initItemNavigation();

			if (oEvent.button === 0) { // left mouse button
				var $Target = jQuery(oEvent.target);

				if (oEvent.target === this.getDomRef("sb")) { // mousedown on interactive resize bar
					InteractiveResizeHelper.initInteractiveResizing(this, oEvent);
				} else if (oEvent.target === this.getDomRef("rsz")) { // mousedown on column resize bar
					ColumnResizeHelper.initColumnResizing(this, oEvent);
				} else if ($Target.hasClass("sapUiTableColResizer")) { // mousedown on mobile column resize button
					var iColIndex = $Target.closest(".sapUiTableCol").attr("data-sap-ui-colindex");
					this._iLastHoveredColumnIndex = parseInt(iColIndex, 10);
					ColumnResizeHelper.initColumnResizing(this, oEvent);
				} else {
					var $Col = $Target.closest(".sapUiTableCol", this.getDomRef());
					if ($Col.length === 1) { // mousedown on a column header

						var iIndex = parseInt($Col.attr("data-sap-ui-colindex"), 10),
							oColumn = this.getColumns()[iIndex];

						// Prevent potentially open column menu from closing and reopening again.
						// see Column#_openMenu
						var oMenu = oColumn.getAggregation("menu");
						oColumn._bSkipOpen = oMenu && oMenu.bOpen;

						this._bShowMenu = true;
						this._mTimeouts.delayedMenuTimer = jQuery.sap.delayedCall(200, this, function() { this._bShowMenu = false; });

						if (this.getEnableColumnReordering()
							&& !(this._isTouchMode(oEvent) && $Target.hasClass("sapUiTableColDropDown")) /*Target is not the mobile column menu button*/) {
							// Start column reordering
							this._getPointerExtension().doReorderColumn(iIndex, oEvent);
						}
					}
				}

				// In case of FireFox and CTRL+CLICK it selects the target TD
				//   => prevent the default behavior only in this case (to still allow text selection)
				// Also prevent default when clicking on ScrollBars to prevent ItemNavigation to re-apply
				// focus to old position (table cell).
				if ((Device.browser.firefox && !!(oEvent.metaKey || oEvent.ctrlKey))
						|| $Target.closest(".sapUiTableHSb", this.getDomRef()).length === 1
						|| $Target.closest(".sapUiTableVSb", this.getDomRef()).length === 1) {
					oEvent.preventDefault();
				}
			}
		},

		onmouseup : function(oEvent) {
			// clean up the timer
			jQuery.sap.clearDelayedCall(this._mTimeouts.delayedColumnReorderTimer);
		},

		ondblclick : function(oEvent) {
			if (Device.system.desktop && oEvent.target === this.getDomRef("rsz")) {
				oEvent.preventDefault();
				ColumnResizeHelper.doAutoResizeColumn(this, this._iLastHoveredColumnIndex);
			}
		},

		onclick : function(oEvent) {
			// clean up the timer
			jQuery.sap.clearDelayedCall(this._mTimeouts.delayedColumnReorderTimer);

			if (oEvent.isMarked()) {
				// the event was already handled by some other handler, do nothing.
				return;
			}

			var $Target = jQuery(oEvent.target);

			if ($Target.hasClass("sapUiAnalyticalTableSum")) {
				// Analytical Table: Sum Row cannot be selected
				oEvent.preventDefault();
				return;
			} else if ($Target.hasClass("sapUiTableGroupMenuButton")) {
				// Analytical Table: Mobile Group Menu Button in Grouping rows
				this._onContextMenu(oEvent);
				oEvent.preventDefault();
				return;
			} else if ($Target.hasClass("sapUiTableGroupIcon") || $Target.hasClass("sapUiTableTreeIcon")) {
				// Grouping Row: Toggle grouping
				if (TableUtils.toggleGroupHeader(this, oEvent.target)) {
					return;
				}
			}

			// forward the event
			if (!this._findAndfireCellEvent(this.fireCellClick, oEvent)) {
				this._onSelect(oEvent);
			} else {
				oEvent.preventDefault();
			}
		}

	};



	/**
	 * Extension for sap.ui.table.Table which handles mouse and touch related things.
	 *
	 * @class Extension for sap.ui.table.Table which handles mouse and touch related things.
	 *
	 * @extends sap.ui.table.TableExtension
	 * @author SAP SE
	 * @version 1.42.6
	 * @constructor
	 * @private
	 * @alias sap.ui.table.TablePointerExtension
	 */
	var TablePointerExtension = TableExtension.extend("sap.ui.table.TablePointerExtension", /* @lends sap.ui.table.TablePointerExtension */ {

		/*
		 * @see TableExtension._init
		 */
		_init : function(oTable, sTableType, mSettings) {
			this._type = sTableType;
			this._delegate = ExtensionDelegate;

			// Register the delegate
			oTable.addEventDelegate(this._delegate, oTable);

			oTable._iLastHoveredColumnIndex = 0;
			oTable._bIsColumnResizerMoving = false;
			oTable._iFirstReorderableIndex = sTableType == TableExtension.TABLETYPES.TREE ? 1 : 0;

			return "PointerExtension";
		},

		/*
		 * @see TableExtension._attachEvents
		 */
		_attachEvents : function() {
			var oTable = this.getTable();
			if (oTable) {
				// Initialize the basic event handling for column resizing.
				ColumnResizeHelper.initColumnTracking(oTable);
			}
		},

		/*
		 * @see TableExtension._detachEvents
		 */
		_detachEvents : function() {
			var oTable = this.getTable();
			if (oTable) {
				// Cleans up the basic event handling for column resizing.
				oTable.$().find(".sapUiTableCtrlScr, .sapUiTableCtrlScrFixed, .sapUiTableColHdrScr, .sapUiTableColHdrFixed").unbind();
			}
		},

		/*
		 * Enables debugging for the extension
		 */
		_debug : function() {
			this._ExtensionHelper = ExtensionHelper;
			this._ColumnResizeHelper = ColumnResizeHelper;
			this._InteractiveResizeHelper = InteractiveResizeHelper;
			this._ReorderHelper = ReorderHelper;
			this._ExtensionDelegate = ExtensionDelegate;
		},

		/*
		 * Resizes the given column to its optimal width if the auto resize feature is available for this column.
		 */
		doAutoResizeColumn : function(iColIndex) {
			var oTable = this.getTable();
			if (oTable) {
				ColumnResizeHelper.doAutoResizeColumn(oTable, iColIndex);
			}
		},

		/*
		 * Initialize the basic event handling for column reordering and starts the reordering.
		 */
		doReorderColumn : function(iColIndex, oEvent) {
			var oTable = this.getTable();
			if (oTable && oTable.getEnableColumnReordering() && ReorderHelper.isColumnReorderable(oTable, iColIndex)) {
				// Starting column drag & drop. We wait 200ms to make sure it is no click on the column to open the menu.
				oTable._mTimeouts.delayedColumnReorderTimer = jQuery.sap.delayedCall(200, oTable, function() {
					ReorderHelper.initReordering(oTable, iColIndex, oEvent);
				});
			}
		},

		/*
		 * @see sap.ui.base.Object#destroy
		 */
		destroy : function() {
			// Deregister the delegates
			var oTable = this.getTable();
			if (oTable) {
				oTable.removeEventDelegate(this._delegate);
			}
			this._delegate = null;

			TableExtension.prototype.destroy.apply(this, arguments);
		}

	});

	return TablePointerExtension;

}, /* bExport= */ true);