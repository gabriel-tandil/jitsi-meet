/* global APP, $, JitsiMeetJS */

/**
 * Initialise global shortcuts.
 * Global shortcuts are shortcuts for features that don't have a button or
 * link associated with the action. In other words they represent actions
 * triggered _only_ with a shortcut.
 */
function initGlobalShortcuts() {

    KeyboardShortcut.registerShortcut("ESCAPE", null, function() {
        APP.UI.showKeyboardShortcutsPanel(false);
    });

    KeyboardShortcut.registerShortcut("?", null, function() {
        JitsiMeetJS.analytics.sendEvent("shortcut.shortcut.help");
        APP.UI.toggleKeyboardShortcutsPanel();
    }, "keyboardShortcuts.toggleShortcuts");

    KeyboardShortcut.registerShortcut("R", null, function() {
        JitsiMeetJS.analytics.sendEvent("shortcut.raisedhand.toggled");
        APP.conference.maybeToggleRaisedHand();
    }, "keyboardShortcuts.raiseHand");

    KeyboardShortcut.registerShortcut("T", null, function() {
        JitsiMeetJS.analytics.sendEvent("shortcut.talk.clicked");
        APP.conference.muteAudio(true);
    }, "keyboardShortcuts.pushToTalk");

    /**
     * FIXME: Currently focus keys are directly implemented below in onkeyup.
     * They should be moved to the SmallVideo instead.
     */
    KeyboardShortcut._addShortcutToHelp("0", "keyboardShortcuts.focusLocal");
    KeyboardShortcut._addShortcutToHelp("1-9", "keyboardShortcuts.focusRemote");
}

/**
 * Map of shortcuts. When a shortcut is registered it enters the mapping.
 * @type {{}}
 */
let _shortcuts = {};

/**
 * Maps keycode to character, id of popover for given function and function.
 */
var KeyboardShortcut = {
    init: function () {
        initGlobalShortcuts();

        var self = this;
        window.onkeyup = function(e) {
            var key = self._getKeyboardKey(e).toUpperCase();
            var num = parseInt(key, 10);
            if(!($(":focus").is("input[type=text]") ||
                $(":focus").is("input[type=password]") ||
                $(":focus").is("textarea"))) {
                if (_shortcuts.hasOwnProperty(key)) {
                    _shortcuts[key].function(e);
                }
                else if (!isNaN(num) && num >= 0 && num <= 9) {
                    APP.UI.clickOnVideo(num + 1);
                }
            //esc while the smileys are visible hides them
            } else if (key === "ESCAPE" &&
                $('#smileysContainer').is(':visible')) {
                APP.UI.toggleSmileys();
            }
        };

        window.onkeydown = function(e) {
            if(!($(":focus").is("input[type=text]") ||
                $(":focus").is("input[type=password]") ||
                $(":focus").is("textarea"))) {
                var key = self._getKeyboardKey(e).toUpperCase();
                if(key === "T") {
                    if(APP.conference.isLocalAudioMuted())
                        APP.conference.muteAudio(false);
                }
            }
        };
        $('body').popover({ selector: '[data-toggle=popover]',
            trigger: 'click hover',
            content: function() {
                return this.getAttribute("content") +
                    self._getShortcut(this.getAttribute("shortcut"));
            }
        });
    },

    /**
     * Registers a new shortcut.
     *
     * @param shortcutChar the shortcut character triggering the action
     * @param shortcutAttr the "shortcut" html element attribute mappring an
     * element to this shortcut and used to show the shortcut character on the
     * element tooltip
     * @param exec the function to be executed when the shortcut is pressed
     * @param helpDescription the description of the shortcut that would appear
     * in the help menu
     */
    registerShortcut: function( shortcutChar,
                                shortcutAttr,
                                exec,
                                helpDescription) {
        _shortcuts[shortcutChar] = {
            character: shortcutChar,
            shortcutAttr: shortcutAttr,
            function: exec
        };

        if (helpDescription)
            this._addShortcutToHelp(shortcutChar, helpDescription);
    },

    /**
     * Unregisters a shortcut.
     *
     * @param shortcutChar unregisters the given shortcut, which means it will
     * no longer be usable
     */
    unregisterShortcut: function(shortcutChar) {
        _shortcuts.remove(shortcutChar);

        this._removeShortcutFromHelp(shortcutChar);
    },

    /**
     *
     * @param id indicates the popover associated with the shortcut
     * @returns {string} the keyboard shortcut used for the id given
     */
    _getShortcut: function (id) {
        for (var key in _shortcuts) {
            if (_shortcuts.hasOwnProperty(key)) {
                if (_shortcuts[key].shortcutAttr === id) {
                    return " (" + _shortcuts[key].character + ")";
                }
            }
        }
        return "";
    },
    /**
     * @param e a KeyboardEvent
     * @returns {string} e.key or something close if not supported
     */
    _getKeyboardKey: function (e) {
        if (typeof e.key === "string") {
            return e.key;
        }
        if (e.type === "keypress" && (
                (e.which >= 32 && e.which <= 126) ||
                (e.which >= 160 && e.which <= 255) )) {
            return String.fromCharCode(e.which);
        }
        // try to fallback (0-9A-Za-z and QWERTY keyboard)
        switch (e.which) {
        case 27:
            return "Escape";
        case 191:
            return e.shiftKey ? "?" : "/";
        }
        if (e.shiftKey || e.type === "keypress") {
            return String.fromCharCode(e.which);
        } else {
            return String.fromCharCode(e.which).toLowerCase();
        }
    },

    /**
     * Adds the given shortcut to the help dialog.
     *
     * @param shortcutChar the shortcut character
     * @param shortcutDescriptionKey the description of the shortcut
     * @private
     */
    _addShortcutToHelp: function (shortcutChar, shortcutDescriptionKey) {

        var listElement = document.createElement("li");
        listElement.id = shortcutChar;

        var spanElement = document.createElement("span");
        spanElement.className = "item-action";

        var kbdElement = document.createElement("kbd");
        kbdElement.className = "regular-key";
        kbdElement.innerHTML = shortcutChar;
        spanElement.appendChild(kbdElement);

        var descriptionElement = document.createElement("span");
        descriptionElement.className = "item-description";
        descriptionElement.setAttribute("data-i18n", shortcutDescriptionKey);
        descriptionElement.innerHTML
            = APP.translation.translateString(shortcutDescriptionKey);

        listElement.appendChild(spanElement);
        listElement.appendChild(descriptionElement);

        var parentListElement
            = document.getElementById("keyboard-shortcuts-list");

        if (parentListElement)
            parentListElement.appendChild(listElement);
    },

    /**
     * Removes the list element corresponding to the given shortcut from the
     * help dialog
     * @private
     */
    _removeShortcutFromHelp: function (shortcutChar) {
        var parentListElement
            = document.getElementById("keyboard-shortcuts-list");

        var shortcutElement = document.getElementById(shortcutChar);

        if (shortcutElement)
            parentListElement.removeChild(shortcutElement);
    }
};

module.exports = KeyboardShortcut;
