var HtmlDiff;
(function (_HtmlDiff) {
    function Execute(oldText, newText) {
        return new HtmlDiff(oldText, newText).Build();
    }
    _HtmlDiff.Execute = Execute;
    var HtmlDiff = (function () {
        function HtmlDiff(oldText, newText) {
            this._specialCaseClosingTags = ["</strong>", "</b>", "</i>", "</big>", "</small>", "</u>", "</sub>", "</sup>", "</strike>", "</s>"];
            this._specialCaseOpeningTags = ["<strong[\\>\\s]+", "<b[\\>\\s]+", "<i[\\>\\s]+", "<big[\\>\\s]+", "<small[\\>\\s]+", "<u[\\>\\s]+", "<sub[\\>\\s]+", "<sup[\\>\\s]+", "<strike[\\>\\s]+", "<s[\\>\\s]+"];
            this._oldText = oldText;
            this._newText = newText;
            this._content = '';
        }
        HtmlDiff.prototype.Build = function () {
            var self = this;
            this.SplitInputsToWords();
            this.IndexNewWords();
            var operations = this.Operations();
            operations.forEach(function (item) {
                self.PerformOperation(item);
            });
            return this._content;
        };
        HtmlDiff.prototype.IndexNewWords = function () {
            this._wordIndices = {};
            for (var i = 0; i < this._newWords.length; i++) {
                var word = this._newWords[i];
                if (HtmlDiff.IsTag(word)) {
                    word = HtmlDiff.StripTagAttributes(word);
                }
                if (this._wordIndices[word]) {
                    this._wordIndices[word].push(i);
                }
                else {
                    this._wordIndices[word] = [i];
                }
            }
        };
        HtmlDiff.StripTagAttributes = function (word) {
            return /^\s*<\s*([^\s=]*)/.exec(word)[0];
        };
        HtmlDiff.prototype.SplitInputsToWords = function () {
            this._oldWords = this.ConvertHtmlToListOfWords(HtmlDiff.Explode(this._oldText));
            this._newWords = this.ConvertHtmlToListOfWords(HtmlDiff.Explode(this._newText));
        };
        HtmlDiff.prototype.ConvertHtmlToListOfWords = function (characterString) {
            var self = this;
            var mode = 0 /* Character */;
            var currentWord = '';
            var words = [];
            characterString.forEach(function (character) {
                switch (mode) {
                    case 0 /* Character */:
                        if (HtmlDiff.IsStartOfTag(character)) {
                            if (currentWord !== '') {
                                words.push(currentWord);
                            }
                            currentWord = "<";
                            mode = 1 /* Tag */;
                        }
                        else if (/\s/.test(character)) {
                            if (currentWord !== '') {
                                words.push(currentWord);
                            }
                            currentWord = character;
                            mode = 2 /* Whitespace */;
                        }
                        else if (/[\w\#@]+/i.test(character)) {
                            currentWord += character;
                        }
                        else {
                            if (currentWord !== '') {
                                words.push(currentWord);
                            }
                            currentWord = character;
                        }
                        break;
                    case 1 /* Tag */:
                        if (HtmlDiff.IsEndOfTag(character)) {
                            currentWord += ">";
                            words.push(currentWord);
                            currentWord = "";
                            mode = HtmlDiff.IsWhiteSpace(character) ? 2 /* Whitespace */ : 0 /* Character */;
                        }
                        else {
                            currentWord += character;
                        }
                        break;
                    case 2 /* Whitespace */:
                        if (HtmlDiff.IsStartOfTag(character)) {
                            if (currentWord !== '') {
                                words.push(currentWord);
                            }
                            currentWord = "<";
                            mode = 1 /* Tag */;
                        }
                        else if (/\\s/.test(character)) {
                            currentWord += character;
                        }
                        else {
                            if (currentWord !== '') {
                                words.push(currentWord);
                            }
                            currentWord = character;
                            mode = 0 /* Character */;
                        }
                        break;
                }
            });
            if (currentWord !== '') {
                words.push(currentWord);
            }
            return words;
        };
        HtmlDiff.prototype.PerformOperation = function (operation) {
            var self = this;
            switch (operation.Action) {
                case 0 /* Equal */:
                    self.ProcessEqualOperation(operation);
                    break;
                case 1 /* Delete */:
                    self.ProcessDeleteOperation(operation, "diffdel");
                    break;
                case 2 /* Insert */:
                    self.ProcessInsertOperation(operation, "diffins");
                    break;
                case 3 /* None */:
                    break;
                case 4 /* Replace */:
                    self.ProcessReplaceOperation(operation);
                    break;
            }
        };
        HtmlDiff.prototype.ProcessReplaceOperation = function (operation) {
            this.ProcessDeleteOperation(operation, "diffmod");
            this.ProcessInsertOperation(operation, "diffmod");
        };
        HtmlDiff.prototype.ProcessInsertOperation = function (operation, cssClass) {
            this.InsertTag("ins", cssClass, this._newWords.filter(function (s, pos) { return pos >= operation.StartInNew && pos < operation.EndInNew; }));
        };
        HtmlDiff.prototype.ProcessDeleteOperation = function (operation, cssClass) {
            var text = this._oldWords.filter(function (s, pos) { return pos >= operation.StartInOld && pos < operation.EndInOld; });
            this.InsertTag("del", cssClass, text);
        };
        HtmlDiff.prototype.ProcessEqualOperation = function (operation) {
            var result = this._newWords.filter(function (s, pos) { return pos >= operation.StartInNew && pos < operation.EndInNew; });
            this._content += result.join("");
        };
        HtmlDiff.prototype.InsertTag = function (tag, cssClass, words) {
            while (true) {
                if (words.length === 0) {
                    break;
                }
                var nonTags = this.ExtractConsecutiveWords(words, function (x) { return !HtmlDiff.IsTag(x); });
                var specialCaseTagInjection = '';
                var specialCaseTagInjectionIsBefore = false;
                if (nonTags.length !== 0) {
                    var text = HtmlDiff.WrapText(nonTags.join(""), tag, cssClass);
                    this._content += (text);
                }
                else {
                    if (FirstOrDefault(this._specialCaseOpeningTags, function (x) { return new RegExp(x).test(words[0]); }) !== null) {
                        specialCaseTagInjection = "<ins class='mod'>";
                        if (tag === "del") {
                            words.shift();
                        }
                    }
                    else if (this._specialCaseClosingTags.some(function (mine) { return mine === words[0]; })) {
                        specialCaseTagInjection = "</ins>";
                        specialCaseTagInjectionIsBefore = true;
                        if (tag === "del") {
                            words.shift();
                        }
                    }
                }
                if (words.length === 0 && specialCaseTagInjection.length === 0) {
                    break;
                }
                if (specialCaseTagInjectionIsBefore) {
                    this._content += specialCaseTagInjection + this.ExtractConsecutiveWords(words, HtmlDiff.IsTag).join("");
                }
                else {
                    this._content += this.ExtractConsecutiveWords(words, HtmlDiff.IsTag).join("") + specialCaseTagInjection;
                }
            }
        };
        HtmlDiff.prototype.ExtractConsecutiveWords = function (words, condition) {
            var indexOfFirstTag = null;
            for (var i = 0; i < words.length; i++) {
                var word = words[i];
                if (!condition(word)) {
                    indexOfFirstTag = i;
                    break;
                }
            }
            if (indexOfFirstTag !== null) {
                var items = words.filter(function (s, pos) { return pos >= 0 && pos < indexOfFirstTag; });
                if (indexOfFirstTag > 0) {
                    words.splice(0, indexOfFirstTag);
                }
                return items;
            }
            else {
                var items = words.filter(function (s, pos) { return pos >= 0 && pos <= words.length; });
                words.splice(0, words.length);
                return items;
            }
        };
        HtmlDiff.prototype.Operations = function () {
            var positionInOld = 0, positionInNew = 0;
            var operations = [];
            var matches = this.MatchingBlocks();
            matches.push(new Match(this._oldWords.length, this._newWords.length, 0));
            matches.forEach(function (match) {
                var matchStartsAtCurrentPositionInOld = (positionInOld === match.StartInOld);
                var matchStartsAtCurrentPositionInNew = (positionInNew === match.StartInNew);
                var action;
                if (matchStartsAtCurrentPositionInOld === false && matchStartsAtCurrentPositionInNew === false) {
                    action = 4 /* Replace */;
                }
                else if (matchStartsAtCurrentPositionInOld && matchStartsAtCurrentPositionInNew === false) {
                    action = 2 /* Insert */;
                }
                else if (matchStartsAtCurrentPositionInOld === false) {
                    action = 1 /* Delete */;
                }
                else {
                    action = 3 /* None */;
                }
                if (action !== 3 /* None */) {
                    operations.push(new Operation(action, positionInOld, match.StartInOld, positionInNew, match.StartInNew));
                }
                if (match.Size !== 0) {
                    operations.push(new Operation(0 /* Equal */, match.StartInOld, match.EndInOld, match.StartInNew, match.EndInNew));
                }
                positionInOld = match.EndInOld;
                positionInNew = match.EndInNew;
            });
            return operations;
        };
        HtmlDiff.prototype.MatchingBlocks = function () {
            var matchingBlocks = [];
            this.FindMatchingBlocks(0, this._oldWords.length, 0, this._newWords.length, matchingBlocks);
            return matchingBlocks;
        };
        HtmlDiff.prototype.FindMatchingBlocks = function (startInOld, endInOld, startInNew, endInNew, matchingBlocks) {
            var match = this.FindMatch(startInOld, endInOld, startInNew, endInNew);
            if (match !== null) {
                if (startInOld < match.StartInOld && startInNew < match.StartInNew) {
                    this.FindMatchingBlocks(startInOld, match.StartInOld, startInNew, match.StartInNew, matchingBlocks);
                }
                matchingBlocks.push(match);
                if (match.EndInOld < endInOld && match.EndInNew < endInNew) {
                    this.FindMatchingBlocks(match.EndInOld, endInOld, match.EndInNew, endInNew, matchingBlocks);
                }
            }
        };
        HtmlDiff.prototype.FindMatch = function (startInOld, endInOld, startInNew, endInNew) {
            var bestMatchInOld = startInOld;
            var bestMatchInNew = startInNew;
            var bestMatchSize = 0;
            var matchLengthAt = {};
            for (var indexInOld = startInOld; indexInOld < endInOld; indexInOld++) {
                var newMatchLengthAt = {};
                var index = this._oldWords[indexInOld];
                if (HtmlDiff.IsTag(index)) {
                    index = HtmlDiff.StripTagAttributes(index);
                }
                if (!(index in this._wordIndices)) {
                    matchLengthAt = newMatchLengthAt;
                    continue;
                }
                this._wordIndices[index].forEach(function (indexInNew) {
                    if (indexInNew < startInNew) {
                        return;
                    }
                    if (indexInNew >= endInNew) {
                        return;
                    }
                    var newMatchLength = (((indexInNew - 1) in matchLengthAt) ? matchLengthAt[indexInNew - 1] : 0) + 1;
                    newMatchLengthAt[indexInNew] = newMatchLength;
                    if (newMatchLength > bestMatchSize) {
                        bestMatchInOld = indexInOld - newMatchLength + 1;
                        bestMatchInNew = indexInNew - newMatchLength + 1;
                        bestMatchSize = newMatchLength;
                    }
                });
                matchLengthAt = newMatchLengthAt;
            }
            return bestMatchSize !== 0 ? new Match(bestMatchInOld, bestMatchInNew, bestMatchSize) : null;
        };
        HtmlDiff.WrapText = function (text, tagName, cssClass) {
            return Format("<{0} class='{1}'>{2}</{0}>", tagName, cssClass, text);
        };
        HtmlDiff.IsTag = function (item) {
            if (HtmlDiff.SpecialCaseWordTags.some(function (re) { return item !== null && StartsWith(item, re); }))
                return false;
            return HtmlDiff.IsOpeningTag(item) || HtmlDiff.IsClosingTag(item);
        };
        HtmlDiff.IsOpeningTag = function (item) {
            return /^\\s*<[^>]+>\\s*$/.test(item);
        };
        HtmlDiff.IsClosingTag = function (item) {
            return /^\\s*<\/[^>]+>\\s*$/.test(item);
        };
        HtmlDiff.IsStartOfTag = function (val) {
            return val === "<";
        };
        HtmlDiff.IsEndOfTag = function (val) {
            return val === ">";
        };
        HtmlDiff.IsWhiteSpace = function (value) {
            return /\\s/.test(value);
        };
        HtmlDiff.Explode = function (value) {
            return value.split('');
        };
        HtmlDiff.SpecialCaseWordTags = ["<img"];
        return HtmlDiff;
    })();
    var Match = (function () {
        function Match(startInOld, startInNew, size) {
            this.StartInOld = startInOld;
            this.StartInNew = startInNew;
            this.Size = size;
        }
        Object.defineProperty(Match.prototype, "EndInOld", {
            get: function () {
                return this.StartInOld + this.Size;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Match.prototype, "EndInNew", {
            get: function () {
                return this.StartInNew + this.Size;
            },
            enumerable: true,
            configurable: true
        });
        return Match;
    })();
    _HtmlDiff.Match = Match;
    var Operation = (function () {
        function Operation(action, startInOld, endInOld, startInNew, endInNew) {
            this.Action = action;
            this.StartInOld = startInOld;
            this.EndInOld = endInOld;
            this.StartInNew = startInNew;
            this.EndInNew = endInNew;
        }
        return Operation;
    })();
    _HtmlDiff.Operation = Operation;
    var Mode;
    (function (Mode) {
        Mode[Mode["Character"] = 0] = "Character";
        Mode[Mode["Tag"] = 1] = "Tag";
        Mode[Mode["Whitespace"] = 2] = "Whitespace";
    })(Mode || (Mode = {}));
    var Action;
    (function (Action) {
        Action[Action["Equal"] = 0] = "Equal";
        Action[Action["Delete"] = 1] = "Delete";
        Action[Action["Insert"] = 2] = "Insert";
        Action[Action["None"] = 3] = "None";
        Action[Action["Replace"] = 4] = "Replace";
    })(Action || (Action = {}));
    function StartsWith(str, regExp) {
        return (new RegExp("^" + regExp)).test(str.toString());
    }
    function EndsWith(str, regExp) {
        return (new RegExp(regExp + "$")).test(str.toString());
    }
    function Format(str) {
        var params = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            params[_i - 1] = arguments[_i];
        }
        return str.replace(/{(\d+)}/g, function (match, number) {
            return typeof params[number] != 'undefined' ? params[number] : match;
        });
    }
    function FirstOrDefault(array, predicate) {
        var filtered = array.filter(predicate);
        if (filtered.length === 0)
            return null;
        return filtered[0];
    }
})(HtmlDiff || (HtmlDiff = {}));
