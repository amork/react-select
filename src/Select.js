/* disable some rules until we refactor more completely; fixing them now would
   cause conflicts with some open PRs unnecessarily. */
/* eslint react/jsx-sort-prop-types: 0, react/sort-comp: 0, react/prop-types: 0 */

var React = require('react');
var Input = require('react-input-autosize');
var classes = require('classnames');
var Value = require('./Value');
var SingleValue = require('./SingleValue');
var Option = require('./Option');

var requestId = 0;

var Select = React.createClass({

	displayName: 'Select',

	propTypes: {
		addLabelText: React.PropTypes.string,      // placeholder displayed when you want to add a label on a multi-value input
		allowCreate: React.PropTypes.bool,         // whether to allow creation of new entries
		asyncOptions: React.PropTypes.func,        // function to call to get options
		autoload: React.PropTypes.bool,            // whether to auto-load the default async options set
		backspaceRemoves: React.PropTypes.bool,    // whether backspace removes an item if there is no text input
		cacheAsyncResults: React.PropTypes.bool,   // whether to allow cache
		className: React.PropTypes.string,         // className for the outer element
		clearAllText: React.PropTypes.string,      // title for the "clear" control when multi: true
		clearValueText: React.PropTypes.string,    // title for the "clear" control
		clearable: React.PropTypes.bool,           // should it be possible to reset value
		createLinkText: React.PropTypes.string,    // text for additional link add if no results found
		delimiter: React.PropTypes.string,         // delimiter to use to join multiple values
		disabled: React.PropTypes.bool,            // whether the Select is disabled or not
		filterOption: React.PropTypes.func,        // method to filter a single option  (option, filterString)
		filterOptions: React.PropTypes.func,       // method to filter the options array: function ([options], filterString, [values])
		ignoreCase: React.PropTypes.bool,          // whether to perform case-insensitive filtering
		inputProps: React.PropTypes.object,        // custom attributes for the Input (in the Select-control) e.g: {'data-foo': 'bar'}
		isLoading: React.PropTypes.bool,           // whether the Select is loading externally or not (such as options being loaded)
		labelKey: React.PropTypes.string,          // path of the label value in option objects
		matchPos: React.PropTypes.string,          // (any|start) match the start or entire string when filtering
		matchProp: React.PropTypes.string,         // (any|label|value) which option property to filter on
		multi: React.PropTypes.bool,               // multi-value input
		name: React.PropTypes.string,              // field name, for hidden <input /> tag
		newOptionCreator: React.PropTypes.func,    // factory to create new options when allowCreate set
		noResultsText: React.PropTypes.string,     // placeholder displayed when there are no matching search results
		onBlur: React.PropTypes.func,              // onBlur handler: function (event) {}
		onChange: React.PropTypes.func,            // onChange handler: function (newValue) {}
		onFocus: React.PropTypes.func,             // onFocus handler: function (event) {}
		onInputChange: React.PropTypes.func,       // onInputChange handler: function (inputValue) {}
		onOptionLabelClick: React.PropTypes.func,  // onCLick handler for value labels: function (value, event) {}
		optionComponent: React.PropTypes.func,     // option component to render in dropdown
		optionRenderer: React.PropTypes.func,      // optionRenderer: function (option) {}
		options: React.PropTypes.array,            // array of options
		placeholder: React.PropTypes.string,       // field placeholder, displayed when there's no value
		searchable: React.PropTypes.bool,          // whether to enable searching feature or not
		searchingText: React.PropTypes.string,     // message to display whilst options are loading via asyncOptions
		searchPromptText: React.PropTypes.string,  // label to prompt for search input
		singleValueComponent: React.PropTypes.func,// single value component when multiple is set to false
		value: React.PropTypes.any,                // initial field value
		valueComponent: React.PropTypes.func,      // value component to render in multiple mode
		searchableInputComponent: React.PropTypes.func,   // value component to render in multiple mode
		valueKey: React.PropTypes.string,          // path of the label value in option objects
		valueRenderer: React.PropTypes.func,       // valueRenderer: function (option) {}

		//Resolves value from user input (input control) to value in state/props (to some option, for example)
		//Will be useful, when props.value is some option _id_ field, while user value is some option text field. This way,
		//we can translate text to option id (or whole option)
		inputValueToValueConverter: React.PropTypes.func
	},

	getDefaultProps () {
		return {
			addLabelText: 'Add "{label}"?',
			allowCreate: false,
			asyncOptions: undefined,
			autoload: true,
			backspaceRemoves: true,
			cacheAsyncResults: true,
			className: undefined,
			clearAllText: 'Clear all',
			clearValueText: 'Clear value',
			clearable: true,
			createLinkText: '',
			delimiter: ',',
			disabled: false,
			ignoreCase: true,
			inputProps: {},
			isLoading: false,
			labelKey: 'label',
			matchPos: 'any',
			matchProp: 'any',
			name: undefined,
			newOptionCreator: undefined,
			noResultsText: 'No results found',
			onChange: undefined,
			onInputChange: undefined,
			onOptionLabelClick: undefined,
			optionComponent: Option,
			options: undefined,
			placeholder: 'Select...',
			searchable: true,
			searchingText: 'Searching...',
			searchPromptText: 'Type to search',
			singleValueComponent: SingleValue,
			value: undefined,
			valueComponent: Value,
			searchableInputComponent: Input,
			valueKey: 'value',
			inputValueToValueConverter: (v) => v
		};
	},

	getInitialState () {
		return {
			/*
			 * set by getStateFromValue on componentWillMount:
			 * - value
			 * - values
			 * - filteredOptions
			 * - inputValue
			 * - placeholder
			 * - focusedOption
			*/
			isFocused: false,
			isLoading: false,
			isOpen: false,
			options: this.props.options,
			asyncOptions: this.props.asyncOptions
		};
	},

	resetOptionsCache () {
		this._optionsCache = {};
	},

	componentWillMount () {
		this.resetOptionsCache();
		this._optionsFilterString = '';
		this._closeMenuIfClickedOutside = (event) => {
			if (!this.state.isOpen) {
				return;
			}
			var menuElem = React.findDOMNode(this.refs.selectMenuContainer);
			var controlElem = React.findDOMNode(this.refs.control);

			var eventOccuredOutsideMenu = this.clickedOutsideElement(menuElem, event);
			var eventOccuredOutsideControl = this.clickedOutsideElement(controlElem, event);

			// Hide dropdown menu if click occurred outside of menu
			if (eventOccuredOutsideMenu && eventOccuredOutsideControl) {
				this.setState({
					isOpen: false
				}, this._unbindCloseMenuIfClickedOutside);
			}
		};
		this._bindCloseMenuIfClickedOutside = () => {
			if (!document.addEventListener && document.attachEvent) {
				document.attachEvent('onclick', this._closeMenuIfClickedOutside);
			} else {
				document.addEventListener('click', this._closeMenuIfClickedOutside);
			}
		};
		this._unbindCloseMenuIfClickedOutside = () => {
			if (!document.removeEventListener && document.detachEvent) {
				document.detachEvent('onclick', this._closeMenuIfClickedOutside);
			} else {
				document.removeEventListener('click', this._closeMenuIfClickedOutside);
			}
		};
		this.setState(this.getStateFromValue(this.props.value));
	},

	componentDidMount () {
		if (this.state.asyncOptions && this.props.autoload) {
			this.autoloadAsyncOptions();
		}
	},

	componentWillUnmount () {
		clearTimeout(this._blurTimeout);
		clearTimeout(this._focusTimeout);
		if (this.state.isOpen) {
			this._unbindCloseMenuIfClickedOutside();
		}
	},

	componentWillReceiveProps (newProps) {
		var optionsChanged = false;
		if (newProps.options !== this.props.options) {
			optionsChanged = true;
			this.setState({
				options: newProps.options,
				filteredOptions: this.filterOptions(newProps.options)
			});
		}

		var asyncOptionsChanged = newProps.asyncOptions !== this.props.asyncOptions;
		if (newProps.value !== this.state.value || newProps.placeholder !== this.props.placeholder || optionsChanged || asyncOptionsChanged)
		{
			var newState;
			var getSyncState = () => this.getStateFromValue(newProps.value, newProps.options, newProps.placeholder);

			if (asyncOptionsChanged) {
				this.resetOptionsCache();
			}

			if (newProps.asyncOptions) {
				newState = {};
			} else {
				newState = getSyncState();
			}
			newState.asyncOptions = newProps.asyncOptions;

			this.setState(newState, () => {
				if (this.state.asyncOptions) {
					this.loadAsyncOptions(newProps.value, {}, () => this.setState(getSyncState()));
				}
			});
		}
	},

	componentDidUpdate () {
		if (!this.props.disabled && this._focusAfterUpdate) {
			clearTimeout(this._blurTimeout);
			clearTimeout(this._focusTimeout);
			this._focusTimeout = setTimeout(() => {
				if (!this.isMounted()) return;
				this.getInputNode().focus();
				this._focusAfterUpdate = false;
			}, 50);
		}
		if (this._focusedOptionReveal) {
			if (this.refs.focused && this.refs.menu) {
				var focusedDOM = React.findDOMNode(this.refs.focused);
				var menuDOM = React.findDOMNode(this.refs.menu);
				var focusedRect = focusedDOM.getBoundingClientRect();
				var menuRect = menuDOM.getBoundingClientRect();

				if (focusedRect.bottom > menuRect.bottom || focusedRect.top < menuRect.top) {
					menuDOM.scrollTop = (focusedDOM.offsetTop + focusedDOM.clientHeight - menuDOM.offsetHeight);
				}
			}
			this._focusedOptionReveal = false;
		}
	},

	focus () {
		this.getInputNode().focus();
	},

	clickedOutsideElement (element, event) {
		var eventTarget = (event.target) ? event.target : event.srcElement;
		while (eventTarget != null) {
			if (eventTarget === element) return false;
			eventTarget = eventTarget.offsetParent;
		}
		return true;
	},

	getStateFromValue (value, options, placeholder) {
		if (!options) {
			options = this.state.options;
		}
		if (!placeholder) {
			placeholder = this.props.placeholder;
		}

		// reset internal filter string
		this._optionsFilterString = '';

		var values = this.initValuesArray(value, options);
		var filteredOptions = this.filterOptions(options, values);

		var focusedOption;
		var valueForState = null;
		if (!this.props.multi && values.length) {
			focusedOption = values[0];
			valueForState = values[0][this.props.valueKey];
		} else {
			focusedOption = this.getFirstFocusableOption(filteredOptions);
			valueForState = values.map((v) => { return v[this.props.valueKey]; }).join(this.props.delimiter);
		}

		return {
			value: valueForState,
			values: values,
			inputValue: '',
			filteredOptions: filteredOptions,
			placeholder: !this.props.multi && values.length ? values[0][this.props.labelKey] : placeholder,
			focusedOption: focusedOption
		};
	},

	getFirstFocusableOption  (options) {
		for (var optionIndex = 0; optionIndex < options.length; ++optionIndex) {
			if (!options[optionIndex].disabled) {
				return options[optionIndex];
			}
		}
	},

	initValuesArray (values, options) {
		if (!Array.isArray(values)) {
			if (typeof values === 'string') {
				values = values === ''
					? []
					: this.props.multi
						? values.split(this.props.delimiter)
						: [ values ];
			} else {
				values = values !== undefined && values !== null ? [values] : [];
			}
		}
		return values.map((val) => {
			if (typeof val === 'string' || typeof val === 'number') {
				for (var key in options) {
					var opt = options.hasOwnProperty(key) && options[key];
					var valueKey = this.props.valueKey;
					var optVal;

					if (opt)  {
						optVal = opt[valueKey];
						if (optVal === val || typeof optVal === 'number' && optVal.toString() === val) {
							return opt;
						}
					}
				}
				return { value: val, label: val };
			} else {
				return val;
			}
		});
	},

	setValue (value, focusAfterUpdate) {
		if (focusAfterUpdate || focusAfterUpdate === undefined) {
			this._focusAfterUpdate = true;
		}
		var newState = this.getStateFromValue(value);
		newState.isOpen = false;
		this.fireChangeEvent(newState);
		this.setState(newState);
	},

	selectValue (value, focusAfterUpdate) {
		if (!this.props.multi) {
			this.setValue(value, focusAfterUpdate);
		} else if (value) {
			this.addValue(value);
		}
		this._unbindCloseMenuIfClickedOutside();
	},

	addValue (value) {
		this.setValue(this.state.values.concat(value));
	},

	popValue () {
		this.setValue(this.state.values.slice(0, this.state.values.length - 1));
	},

	removeValue (valueToRemove) {
		this.setValue(this.state.values.filter(function(value) {
			return value !== valueToRemove;
		}));
	},

	clearValue (event) {
		// if the event was triggered by a mousedown and not the primary
		// button, ignore it.
		if (event && event.type === 'mousedown' && event.button !== 0) {
			return;
		}
		event.stopPropagation();
		event.preventDefault();
		this.setValue(null);
	},

	resetValue () {
		this.setValue(this.state.value === '' ? null : this.state.value);
	},

	getInputNode  () {
		var input = this.refs.input;
		return this.props.searchable ? input : React.findDOMNode(input);
	},

	fireChangeEvent (newState) {
		if (newState.value !== this.state.value && this.props.onChange) {
			this.props.onChange(newState.value, newState.values);
		}
	},

	handleMouseDown (event) {
		// if the event was triggered by a mousedown and not the primary
		// button, or if the component is disabled, ignore it.
		if (this.props.disabled || (event.type === 'mousedown' && event.button !== 0)) {
			return;
		}
		event.stopPropagation();
		event.preventDefault();

		// for the non-searchable select, close the dropdown when button is clicked
		if (this.state.isOpen && !this.props.searchable) {
			this.setState({
				isOpen: false
			}, this._unbindCloseMenuIfClickedOutside);
			return;
		}

		if (this.state.isFocused) {
			this.setState({
				isOpen: true
			}, this._bindCloseMenuIfClickedOutside);
		} else {
			this._openAfterFocus = true;
			this.getInputNode().focus();
		}
	},

	handleMouseDownOnMenu (event) {
		// if the event was triggered by a mousedown and not the primary
		// button, or if the component is disabled, ignore it.
		if (this.props.disabled || (event.type === 'mousedown' && event.button !== 0)) {
			return;
		}
		event.stopPropagation();
		event.preventDefault();
	},

	handleMouseDownOnArrow (event) {
		// if the event was triggered by a mousedown and not the primary
		// button, or if the component is disabled, ignore it.
		if (this.props.disabled || (event.type === 'mousedown' && event.button !== 0)) {
			return;
		}
		// If not focused, handleMouseDown will handle it
		if (!this.state.isOpen) {
			return;
		}
		event.stopPropagation();
		event.preventDefault();
		this.setState({
			isOpen: false
		}, this._unbindCloseMenuIfClickedOutside);
	},

	handleInputFocus (event) {
		var newIsOpen = this.state.isOpen || this._openAfterFocus;
		this.setState({
			isFocused: true,
			isOpen: newIsOpen
		}, () => {
			if (newIsOpen) {
				this._bindCloseMenuIfClickedOutside();
			}
			else {
				this._unbindCloseMenuIfClickedOutside();
			}
		});
		this._openAfterFocus = false;
		if (this.props.onFocus) {
			this.props.onFocus(event);
		}
	},

	handleInputBlur (event) {
        var _this7 = this;

        var menuDOM = React.findDOMNode(this.refs.menu);
        if (document.activeElement.isEqualNode(menuDOM)) {
            return;
        }

        this._blurTimeout = setTimeout(function () {
            if (_this7._focusAfterUpdate || !_this7.isMounted()) return;
            _this7.setState({
                inputValue: '',
                isFocused: false,
                isOpen: false
            });
        }, 50);
        if (this.props.onBlur) {
            this.props.onBlur(event);
        }
	},

	handleKeyDown (event) {
		if (this.props.disabled) return;
		switch (event.keyCode) {
			case 8: // backspace
				if (!this.state.inputValue && this.props.backspaceRemoves) {
					event.preventDefault();
					this.popValue();
				}
			return;
			case 13: // enter
				this.selectFocusedOption();
			break;
			case 27: // escape
				if (this.state.isOpen) {
					this.resetValue();
				} else if (this.props.clearable) {
					this.clearValue(event);
				}
			break;
			case 38: // up
				this.focusPreviousOption();
			break;
			case 40: // down
				this.focusNextOption();
			break;
			case 188: // ,
				if (this.props.allowCreate && this.props.multi) {
					event.preventDefault();
					event.stopPropagation();
					this.selectFocusedOption();
				} else {
					return;
				}
			break;
			default: return;
		}
		event.preventDefault();
	},

	// Ensures that the currently focused option is available in filteredOptions.
	// If not, returns the first available option.
	_getNewFocusedOption (filteredOptions) {
		for (var key in filteredOptions) {
			if (filteredOptions.hasOwnProperty(key) && filteredOptions[key] === this.state.focusedOption) {
				return filteredOptions[key];
			}
		}
		return this.getFirstFocusableOption(filteredOptions);
	},

	handleInputChange (event) {
		// assign an internal variable because we need to use
		// the latest value before setState() has completed.
		this._optionsFilterString = event.target.value;

		if (this.props.onInputChange) {
			this.props.onInputChange(event.target.value);
		}

		if (this.state.asyncOptions) {
			this.setState({
				isLoading: true,
				inputValue: event.target.value
			});
			this.loadAsyncOptions(event.target.value, {
				isLoading: false,
				isOpen: true
			}, this._bindCloseMenuIfClickedOutside);
		} else {
			var filteredOptions = this.filterOptions(this.state.options);
			this.setState({
				isOpen: true,
				inputValue: event.target.value,
				filteredOptions: filteredOptions,
				focusedOption: this._getNewFocusedOption(filteredOptions)
			}, this._bindCloseMenuIfClickedOutside);
		}
	},

	autoloadAsyncOptions () {
		this.setState({
			isLoading: true
		});
		this.loadAsyncOptions((this.props.value || ''), { isLoading: false }, () => {
			// update with new options but don't focus
			this.setValue(this.props.value, false);
		});
	},

	loadAsyncOptions (input, state, callback) {
		var thisRequestId = this._currentRequestId = requestId++;
		if (this.props.cacheAsyncResults) {
			for (var i = 0; i <= input.length; i++) {
				var cacheKey = input.slice(0, i);
				if (this._optionsCache[cacheKey] && (input === cacheKey || this._optionsCache[cacheKey].complete)) {
					var options = this._optionsCache[cacheKey].options;
					var filteredOptions = this.filterOptions(options);
					var newState = {
						options: options,
						filteredOptions: filteredOptions,
						focusedOption: this._getNewFocusedOption(filteredOptions)
					};
					for (var key in state) {
						if (state.hasOwnProperty(key)) {
							newState[key] = state[key];
						}
					}
					this.setState(newState);
					if (callback) callback.call(this, newState);
					return;
				}
			}
		}

		this.state.asyncOptions(input, (err, data) => {
			if (err) throw err;
			if (this.props.cacheAsyncResults) {
				this._optionsCache[input] = data;
			}
			if (thisRequestId !== this._currentRequestId) {
				return;
			}
			var filteredOptions = this.filterOptions(data.options);
			var newState = {
				options: data.options,
				filteredOptions: filteredOptions,
				focusedOption: this._getNewFocusedOption(filteredOptions)
			};
			for (var key in state) {
				if (state.hasOwnProperty(key)) {
					newState[key] = state[key];
				}
			}
			this.setState(newState);
			if (callback) {
				callback.call(this, newState);
			}
		});
	},

	filterOption (op, filterValue) {
		if (this.props.multi && exclude.indexOf(op[this.props.valueKey]) > -1)
			return false;

		if (this.props.filterOption)
			return this.props.filterOption.call(this, op, filterValue);

		var valueTest = String(op[this.props.valueKey]);
		var labelTest = String(op[this.props.labelKey]);
		if (this.props.ignoreCase) {
			valueTest = valueTest.toLowerCase();
			labelTest = labelTest.toLowerCase();
			filterValue = filterValue.toLowerCase();
		}
		var partial, exact, matchProp = this.props.matchProp;
		if (filterValue) {
			partial = (this.props.matchPos === 'start') ? (
				(matchProp !== 'label' && valueTest.substr(0, filterValue.length) === filterValue) ||
				(matchProp !== 'value' && labelTest.substr(0, filterValue.length) === filterValue)
			) : (
				(matchProp !== 'label' && valueTest.indexOf(filterValue) >= 0) ||
				(matchProp !== 'value' && labelTest.indexOf(filterValue) >= 0)
			);

			exact = partial &&
					((matchProp !== 'label' && valueTest === filterValue) ||
					 (matchProp !== 'value' && labelTest === filterValue));
		} else {
			partial = true;
			exact = false;
		}
		return exact ? 'exact' : partial ? 'partial' : false;
	},

	filterOptions (options, values) {
		var filterValue = this._optionsFilterString;
		var exclude = (values || this.state.values).map((i) => i[this.props.valueKey]);
		if (this.props.filterOptions) {
			return this.props.filterOptions.call(this, options, filterValue, exclude);
		} else {
			return (options || []).filter((op) => !!this.filterOption(op, filterValue), this);
		}
	},

	selectFocusedOption (focusAfterUpdate) {
		if (this.props.allowCreate && !this.state.focusedOption) {
			var value = this.props.inputValueToValueConverter(this.state.inputValue, this.state.options);
			return this.selectValue(value, focusAfterUpdate);
		}

		if (this.state.focusedOption) {
			return this.selectValue(this.state.focusedOption, focusAfterUpdate);
		}
	},

	focusOption (op) {
		this.setState({
			focusedOption: op
		});
	},

	focusNextOption () {
		this.focusAdjacentOption('next');
	},

	focusPreviousOption () {
		this.focusAdjacentOption('previous');
	},

	focusAdjacentOption (dir) {
		this._focusedOptionReveal = true;
		var ops = this.state.filteredOptions.filter(function(op) {
			return !op.disabled;
		});
		if (!this.state.isOpen) {
			this.setState({
				isOpen: true,
				inputValue: '',
				focusedOption: this.state.focusedOption || ops[dir === 'next' ? 0 : ops.length - 1]
			}, this._bindCloseMenuIfClickedOutside);
			return;
		}
		if (!ops.length) {
			return;
		}
		var focusedIndex = -1;
		for (var i = 0; i < ops.length; i++) {
			if (this.state.focusedOption === ops[i]) {
				focusedIndex = i;
				break;
			}
		}
		var focusedOption = ops[0];
		if (dir === 'next' && focusedIndex > -1 && focusedIndex < ops.length - 1) {
			focusedOption = ops[focusedIndex + 1];
		} else if (dir === 'previous') {
			if (focusedIndex > 0) {
				focusedOption = ops[focusedIndex - 1];
			} else {
				focusedOption = ops[ops.length - 1];
			}
		}
		this.setState({
			focusedOption: focusedOption
		});
	},

	unfocusOption (op) {
		if (this.state.focusedOption === op) {
			this.setState({
				focusedOption: null
			});
		}
	},

	buildMenu () {
		var focusedValue = this.state.focusedOption ? this.state.focusedOption[this.props.valueKey] : null;
		var renderLabel = this.props.optionRenderer;
		if (!renderLabel) renderLabel = (op) => op[this.props.labelKey];
		if (this.state.filteredOptions.length > 0) {
			focusedValue = focusedValue == null ? this.state.filteredOptions[0] : focusedValue;
		}
		// Add the current value to the filtered options in last resort
		var options = this.state.filteredOptions || [];
		if (this.props.allowCreate && this.state.inputValue.trim()) {
			var inputValue = this.state.inputValue;
			var isNewValue = !options.find((op) => this.filterOption(op, inputValue) === 'exact');
			if (isNewValue) {
				options = options.slice();
				var newOption = this.props.newOptionCreator ? this.props.newOptionCreator(inputValue) : {
					value: inputValue,
					label: inputValue,
					create: true
				};
				options.unshift(newOption);
			}
		}
		var ops = Object.keys(options).map(function(key) {
			var op = options[key];
			var isSelected = this.state.value === op[this.props.valueKey];
			var isFocused = focusedValue === op[this.props.valueKey];
			var optionClass = classes({
				'Select-option': true,
				'is-selected': isSelected,
				'is-focused': isFocused,
				'is-disabled': op.disabled
			});
			var ref = isFocused ? 'focused' : null;
			var mouseEnter = this.focusOption.bind(this, op);
			var mouseLeave = this.unfocusOption.bind(this, op);
			var mouseDown = this.selectValue.bind(this, op);
			var optionResult = React.createElement(this.props.optionComponent, {
				key: 'option-' + op[this.props.valueKey],
				className: optionClass,
				renderFunc: renderLabel,
				mouseEnter: mouseEnter,
				mouseLeave: mouseLeave,
				mouseDown: mouseDown,
				click: mouseDown,
				addLabelText: this.props.addLabelText,
				option: op,
				ref: ref,
				createLinkText: this.props.createLinkText
			});
			return optionResult;
		}, this);

		if (ops.length) {
			return ops;
		} else {
			var noResultsText, promptClass;
			if (this.isLoading()) {
				promptClass = 'Select-searching';
				noResultsText = this.props.searchingText;
			} else if (this.state.inputValue || !this.state.asyncOptions) {
				promptClass = 'Select-noresults';
				noResultsText = this.props.noResultsText;
			} else {
				promptClass = 'Select-search-prompt';
				noResultsText = this.props.searchPromptText;
			}

			return (
				<div className={promptClass}>
					{noResultsText}
				</div>
			);
		}
	},

	handleOptionLabelClick  (value, event) {
		if (this.props.onOptionLabelClick) {
			this.props.onOptionLabelClick(value, event);
		}
	},

	isLoading () {
		return this.props.isLoading || this.state.isLoading;
	},

	render () {
		var selectClass = classes('Select', this.props.className, {
			'is-multi': this.props.multi,
			'is-searchable': this.props.searchable,
			'is-open': this.state.isOpen,
			'is-focused': this.state.isFocused,
			'is-loading': this.isLoading(),
			'is-disabled': this.props.disabled,
			'has-value': this.state.value
		});
		var value = [];
		if (this.props.multi) {
			this.state.values.forEach(function(val) {
				var onOptionLabelClick = this.handleOptionLabelClick.bind(this, val);
				var onRemove = this.removeValue.bind(this, val);
				var valueComponent = React.createElement(this.props.valueComponent, {
					key: val.value,
					option: val,
					renderer: this.props.valueRenderer,
					optionLabelClick: !!this.props.onOptionLabelClick,
					onOptionLabelClick: onOptionLabelClick,
					onRemove: onRemove,
					disabled: this.props.disabled
				});
				value.push(valueComponent);
			}, this);
		}

		if (!this.state.inputValue && (!this.props.multi || !value.length)) {
			var val = this.state.values[0] || null;
			if (this.props.valueRenderer && !!this.state.values.length) {
				value.push(<Value
						key={0}
						option={val}
						renderer={this.props.valueRenderer}
						disabled={this.props.disabled} />);
			} else {
				var singleValueComponent = React.createElement(this.props.singleValueComponent, {
					key: 'placeholder',
					value: val,
					placeholder: this.state.placeholder
				});
				value.push(singleValueComponent);
			}
		}

		var loading = this.isLoading() ? <span className="Select-loading" aria-hidden="true" /> : null;
		var clear = this.props.clearable && this.state.value && !this.props.disabled ? <span className="Select-clear" title={this.props.multi ? this.props.clearAllText : this.props.clearValueText} aria-label={this.props.multi ? this.props.clearAllText : this.props.clearValueText} onMouseDown={this.clearValue} onTouchEnd={this.clearValue} onClick={this.clearValue} dangerouslySetInnerHTML={{ __html: '&times;' }} /> : null;

		var menu;
		var menuProps;
		if (this.state.isOpen) {
			menuProps = {
				ref: 'menu',
				className: 'Select-menu',
				onMouseDown: this.handleMouseDownOnMenu
			};
			menu = (
				<div ref="selectMenuContainer" className="Select-menu-outer">
					<div {...menuProps}>{this.buildMenu()}</div>
				</div>
			);
		}

		var input;
		var inputProps = {
			ref: 'input',
			className: 'Select-input ' + (this.props.inputProps.className || ''),
			tabIndex: this.props.tabIndex || 0,
			onFocus: this.handleInputFocus,
			onBlur: this.handleInputBlur
		};
		var SearchInput = this.props.searchableInputComponent;

		for (var key in this.props.inputProps) {
			if (this.props.inputProps.hasOwnProperty(key) && key !== 'className') {
				inputProps[key] = this.props.inputProps[key];
			}
		}

		if (!this.props.disabled) {
			if (this.props.searchable) {
				input = <SearchInput value={this.state.inputValue} onChange={this.handleInputChange} minWidth="5" {...inputProps} />;
			} else {
				input = <div {...inputProps}>&nbsp;</div>;
			}
		} else if (!this.props.multi || !this.state.values.length) {
			input = <div className="Select-input">&nbsp;</div>;
		}

		return (
			<div ref="wrapper" className={selectClass}>
				<input type="hidden" ref="value" name={this.props.name} value={this.state.value} disabled={this.props.disabled} />
				<div className="Select-control" ref="control" onKeyDown={this.handleKeyDown} onMouseDown={this.handleMouseDown} onTouchEnd={this.handleMouseDown}>
					{value}
					{input}
					<span className="Select-arrow-zone" onMouseDown={this.handleMouseDownOnArrow} />
					<span className="Select-arrow" onMouseDown={this.handleMouseDownOnArrow} />
					{loading}
					{clear}
				</div>
				{menu}
			</div>
		);
	}

});

module.exports = Select;
