/// <reference path="..\HtmlDiff.ts"/>

interface TestCase {
    test: () => any;
    name: string;
}
var failures: any[] = [];
var tests: TestCase[] = [];
var current: string;

function Assert(value: boolean, message: string): void {
    console.assert(value);
    if (!value) {
        failures.push({test: current, message: escapeHtml(message)});
    }
}
function AssertEqual(actual: any, expected: any, message: string): void {
    Assert(actual === expected, message + " Expected: " + expected + " but got " + actual + " instead.");
}

function Test(testName: string, test: () => any) {
    tests.push({ test: test, name: testName });
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

/******************************************************/

// Shamelessly copied specs from here https://github.com/Rohland/htmldiff.net/blob/master/Test.HtmlDiff/HtmlDiffSpecTests.cs, which
// itself copied specs from here with a few modifications: https://github.com/myobie/htmldiff/blob/master/spec/htmldiff_spec.rb

Test("Spec1", function() {
    var output: string = HtmlDiff.Execute("a word is here", "a nother word is there");
    AssertEqual(output, "a<ins class='diffins'> nother</ins> word is <del class='diffmod'>here</del><ins class='diffmod'>there</ins>", "Spec should match");
});
Test("Spec2", function () {
    var output: string = HtmlDiff.Execute("a c", "a b c");
    AssertEqual(output, "a <ins class='diffins'>b </ins>c", "Spec should match");
});
Test("Spec3", function () {
    var output: string = HtmlDiff.Execute("a b c", "a c");
    AssertEqual(output, "a <del class='diffdel'>b </del>c", "Spec should match");
});
Test("Spec4", function () {
    var output: string = HtmlDiff.Execute("a b c", "a d c");
    AssertEqual(output, "a <del class='diffmod'>b</del><ins class='diffmod'>d</ins> c", "Spec should match");
});
Test("Spec5", function () {
    var output: string = HtmlDiff.Execute("<a title='xx'>test</a>", "<a title='yy'>test</a>");
    AssertEqual(output, "<a title='yy'>test</a>", "Spec should match");
});
Test("Spec6", function () {
    var output: string = HtmlDiff.Execute("<img src='logo.jpg'/>", "");
    AssertEqual(output, "<del class='diffdel'><img src='logo.jpg'/></del>", "Spec should match");
});
Test("Csharp-Spec7", function () {
    var output: string = HtmlDiff.Execute("", "<img src='logo.jpg'/>");
    AssertEqual(output, "<ins class='diffins'><img src='logo.jpg'/></ins>", "Spec should match");
});
Test("CsharpBug", function () {
    // via https://github.com/Rohland/htmldiff.net/issues/3, itself via
    // https://github.com/Rohland/htmldiff.net/blob/master/Test.HtmlDiff/Bugs/DiffTests.cs
    var oldText = "The Dealer.";
    var newText = "The Dealer info,";
    var output = HtmlDiff.Execute(oldText, newText);
    AssertEqual("The Dealer<del class='diffmod'>.</del><ins class='diffmod'> info,</ins>", output, "Result of diff should match.");
});
/******************************************************/

function RunTests() {
    tests.forEach(test => {
        current = test.name;
        test.test();
    });
    document.body.innerHTML = "<h1>Test Results</h1><p>" + failures.length + " failures.</p><h2>Failures</h2><ul>" + failures.map(f => "<li>For test \"" + f.test + "\": " + f.message + "</li>").join("") + "</ul>";
}
function ready(fn) {
    if (document.readyState != 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}
ready(RunTests);