import { Map } from 'immutable';
import { VNode } from 'dojo-interfaces/vdom';
import { DNode, HNode } from 'dojo-interfaces/widgetBases';
import d from '../util/d';
import { ComposeFactory } from 'dojo-compose/compose';
import createDestroyable from 'dojo-compose/bases/createDestroyable';
import { Handle } from 'dojo-interfaces/core';
import { Destroyable, StatefulOptions } from 'dojo-interfaces/bases';
import { from as arrayFrom } from 'dojo-shim/array';
import WeakMap from 'dojo-shim/WeakMap';
import createWidgetBase from './../bases/createWidgetBase';
import { Widget, WidgetState } from 'dojo-interfaces/widgetBases';
import { Closeable, CloseableState } from './createCloseableMixin';
import createParentMapMixin, { ParentMapMixin, ParentMapMixinOptions } from './createParentMapMixin';
import { Child, ChildEntry } from './interfaces';
import css from '../themes/structural/modules/TabbedMixin';

export interface TabbedChildState extends WidgetState, CloseableState {
	/**
	 * Whether the current child is the active/visible child
	 */
	active?: boolean;

	/**
	 *
	 */
	label?: string;

	/**
	 * Should this child represent that it is in a changed state that is not persisted
	 */
	changed?: boolean; /* TODO: Implement this feature, currently it does not affect anything */
}

export type TabbedChild = Child & Closeable & Widget<TabbedChildState>;

export interface TabbedMixinOptions<C extends TabbedChild, S extends WidgetState> extends ParentMapMixinOptions<C>, StatefulOptions<S> {
	/**
	 * An optional method which can be used to sort the children
	 */
	sort?: <C extends Child>(valueA: ChildEntry<C>, valueB: ChildEntry<C>) => number;
}

export interface Tabbed<C extends TabbedChild> {
	/**
	 * A map of the children owned by this widget
	 */
	children: Map<string, C>;

	/**
	 * A reference to the currently active child
	 */
	activeChild: C;

	/**
	 * An optional method which can be used to sort the children when they are rendered
	 * @param valueA The first entry to be compared
	 * @param valueB The second entry to be compared
	 */
	sort?<C extends Child>(valueA: ChildEntry<C>, valueB: ChildEntry<C>): number;

	/**
	 * Tag names used by sub parts of this widget
	 */
	tagNames: {
		tabBar: string;
		tab: string;
	};
}

export type TabbedMixin<C extends TabbedChild> = Tabbed<C> & ParentMapMixin<C> & Widget<WidgetState> & Destroyable;

/**
 * A utility function that sets the supplied tab as the active tab on the supplied tabbed mixin
 * @param tabbed The tabbed mixin to set the active child on
 * @param activeTab The tab to make active/visible
 */
function setActiveTab(tabbed: TabbedMixin<TabbedChild>, activeTab: TabbedChild) {
	tabbed.children.forEach((tab) => {
		if (tab && tab !== activeTab && tab.state && tab.state.active) {
			tab.setState({ active: false });
		}
	});
	if (!activeTab.state.active) {
		activeTab.setState({ active: true });
	}
}

/**
 * Return the currently active tab, if no tab is active, the first tab will be made active
 * @param tabbed The tabbed mixin to return the active child for
 */
function getActiveTab(tabbed: TabbedMixin<TabbedChild>): TabbedChild {
	let activeTab = tabbed.children.find((tab: any) => {
		return tab && tab.state && tab.state.active;
	});
	/* TODO: when a tab closes, instead of going back to the previous active tab, it will always
	 * revert to the first tab, maybe it would be better to keep track of a stack of tabs? */
	if (!activeTab) {
		activeTab = tabbed.children.values().next().value;
	}
	if (activeTab) {
		setActiveTab(tabbed, activeTab);
	}
	return activeTab;
}

interface TabListeners {
	/**
	 * The listener for when a tab is clicked on (selected)
	 */
	onclickTabListener(evt: MouseEvent): boolean;

	/**
	 * The listener for when the close button is clicked
	 */
	onclickTabCloseListener(evt: MouseEvent): boolean;
}

/**
 * A weakmap of tabs and their listeners
 */
const tabListenersMap = new WeakMap<TabbedChild, TabListeners>();

/**
 * A utility function that sets the listeners for a tab which are then passed in the generated VDom.  The function
 * returns a handle that can be used to clean up the listeners
 * @param tabbed The tabbed mixin that should be effected when the listeners fire
 * @param tab The tab that the listeners are referring to
 */
function setTabListeners(tabbed: TabbedMixin<TabbedChild>, tab: TabbedChild): Handle {
	/* TODO: There is an edge case where if a child tab is moved from one tabbed panel to another without being destroyed */
	tabListenersMap.set(tab, {
		onclickTabListener(evt: MouseEvent): boolean {
			evt.preventDefault();
			setActiveTab(tabbed, tab);
			return true;
		},
		onclickTabCloseListener(evt: MouseEvent): boolean {
			evt.preventDefault();
			tab.close().then((result) => {
				/* while Maquette schedules a render on DOM events, close happens async, therefore we have to
				 * invalidate the tabbed when resolved, otherwise the tab panel won't reflect the actual
				 * children */
				if (result) {
					tabbed.invalidate();
				};
			});
			return true;
		}
	});
	return {
		destroy() {
			const tabListeners = tabListenersMap.get(tab);
			if (tabListeners) {
				tabListenersMap.delete(tab);
			}
		}
	};
}

/**
 * Return (or initilize) the tab listeners for a tab
 * @param tabbed The tabbed mixin that the listerns refer to
 * @param tab The tab that the listeners should be retrieved for
 */
function getTabListeners(tabbed: TabbedMixin<TabbedChild>, tab: TabbedChild): TabListeners {
	if (!tabListenersMap.has(tab)) {
		/* When the tab is destroyed, it will remove its listeners */
		tab.own(setTabListeners(tabbed, tab));
	}
	return tabListenersMap.get(tab);
}

export interface TabbedMixinFactory extends ComposeFactory<TabbedMixin<TabbedChild>, TabbedMixinOptions<TabbedChild, WidgetState>> {}

const childrenNodesCache = new WeakMap<TabbedMixin<TabbedChild>, (HNode & { properties: any })[]>();

const createTabbedMixin: TabbedMixinFactory = createWidgetBase
	.mixin({
		mixin: <Tabbed<TabbedChild>> {
			tagNames: {
				tabBar: 'ul',
				tab: 'li'
			},

			get activeChild(this: TabbedMixin<TabbedChild>): TabbedChild {
				return getActiveTab(this);
			},

			set activeChild(this: TabbedMixin<TabbedChild>, value: TabbedChild) {
				setActiveTab(this, value);
			}
		}
	})
	.mixin(createParentMapMixin)
	.mixin(createDestroyable)
	.extend({
		tagName: 'dojo-panel-mixin',

		getChildrenNodes(this: TabbedMixin<TabbedChild>): (DNode | string)[] {
			const tabbed = this;
			const activeTab = getActiveTab(tabbed);

			function getTabChildVNode(tab: TabbedChild): DNode[] {
				const tabListeners = getTabListeners(tabbed, tab);
				const nodes: DNode[] = [];
				if (tab.state.label) {
					nodes.push(d(`div.${css['tab-label']}`, { onclick: tabListeners.onclickTabListener, innerHTML: tab.state.label }));
				}
				if (tab.state.closeable) {
					nodes.push(d('div', { onclick: tabListeners.onclickTabCloseListener }));
				}
				return nodes;
			}

			/* We need to generate a set of VDom the represents the buttons */
			/* TODO: Allow the location of the tab bar to be set (top/left/bottom/right) */
			const tabs: DNode[] = [];
			let childrenNodes = childrenNodesCache.get(tabbed);

			/* Best to discard the childrenNodes array if the sizes don't match, otherwise
				* we can get some vdom generation issues when adding or removing tabs */
			if (!childrenNodes || childrenNodes.length !== tabbed.children.size) {
				childrenNodes = Array(tabbed.children.size);
				childrenNodesCache.set(tabbed, childrenNodes);
			}

			const { sort } = tabbed;

			const children = sort
				? arrayFrom<[string, TabbedChild]>(<any> tabbed.children.entries()).sort(sort)
				: arrayFrom<[string, TabbedChild]>(<any> tabbed.children.entries());

			children.forEach(([ , tab ], idx) => {
				const isActiveTab = tab === activeTab;
				const node = childrenNodes[idx];
				const isVisibleNode = node &&
					node.properties &&
					node.properties['data-visible'];

				if (isActiveTab || isVisibleNode) {
					tab.invalidate();
					const tabVNode = tab.render();
					if (tabVNode.properties) {
						(tabVNode as any).properties['data-visible'] = String(isActiveTab);
					}
					const childNode: HNode & { properties: any }  = {
						properties: tabVNode.properties,
						children: [],
						render(): VNode {
							return tabVNode;
						}
					};
					childNode.render.bind(tab);
					childrenNodes[idx] = childNode;
				}
				/* else, this tab isn't active and hasn't been previously rendered */

				tabs.push(d(tabbed.tagNames.tab, {
					key: tab,
					'data-active': String(isActiveTab),
					'data-tab-id': tabbed.id
				}, getTabChildVNode(tab)));
			});

			return [ d(tabbed.tagNames.tabBar, {}, tabs), d('div.' + css.panels, {}, childrenNodes) ];
		}
	});

export default createTabbedMixin;
