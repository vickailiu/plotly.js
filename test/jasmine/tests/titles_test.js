var d3 = require('d3');

var Plotly = require('@lib/index');
var interactConstants = require('@src/constants/interactions');
var Lib = require('@src/lib');

var createGraphDiv = require('../assets/create_graph_div');
var destroyGraphDiv = require('../assets/destroy_graph_div');
var mouseEvent = require('../assets/mouse_event');

describe('Plot title', function() {
    'use strict';

    var data = [{x: [1, 2, 3], y: [1, 2, 3]}];
    var layout = {
        title: {
            text: 'Plotly line chart'
        }
    };
    var gd;

    beforeEach(function() {
        gd = createGraphDiv();
    });

    afterEach(destroyGraphDiv);

    it('is centered horizontally and vertically above the plot by default', function() {
        Plotly.plot(gd, data, layout);

        expectDefaultCenteredPosition(gd);
    });

    it('can still be defined as `layout.title` to ensure backwards-compatibility', function() {
        Plotly.plot(gd, data, {title: 'Plotly line chart'});

        expectTitle('Plotly line chart');
        expectDefaultCenteredPosition(gd);
    });

    it('can be updated via `relayout`', function(done) {
        Plotly.plot(gd, data, {title: 'Plotly line chart'})
          .then(expectTitleFn('Plotly line chart'))
          .then(function() {
              return Plotly.relayout(gd, {title: {text: 'Some other title'}});
          })
          .then(expectTitleFn('Some other title'))
          .catch(fail)
          .then(done);
    });

    it('preserves alignment when text is updated via `Plotly.relayout` using an attribute string', function() {
        // TODO implement once alignment is implemented
    });

    it('preserves alignment when text is updated via `Plotly.update` using an attribute string', function() {
        // TODO implement once alignment is implemented
    });

    it('discards alignment when text is updated via `Plotly.relayout` by passing a new title object', function() {
        // TODO implement once alignment is implemented
    });

    it('discards alignment when text is updated via `Plotly.update` by passing a new title object', function() {
        // TODO implement once alignment is implemented
    });
});

describe('titles can be updated', function() {
    'use strict';

    var data = [{x: [1, 2, 3], y: [1, 2, 3]}];
    var NEW_TITLE = 'Weight over years';
    var NEW_XTITLE = 'Age in years';
    var NEW_YTITLE = 'Average weight';
    var gd;

    beforeEach(function() {
        var layout = {
            title: {text: 'Plotly line chart'},
            xaxis: {title: {text: 'Age'}},
            yaxis: {title: {text: 'Weight'}}
        };
        gd = createGraphDiv();
        Plotly.plot(gd, data, Lib.extendDeep({}, layout));

        expectTitles('Plotly line chart', 'Age', 'Weight');
    });

    afterEach(destroyGraphDiv);

    [
        {
            desc: 'by replacing the entire title objects',
            update: {
                title: {text: NEW_TITLE},
                xaxis: {title: {text: NEW_XTITLE}},
                yaxis: {title: {text: NEW_YTITLE}}
            }
        },
        {
            desc: 'by using attribute strings',
            update: {
                'title.text': NEW_TITLE,
                'xaxis.title.text': NEW_XTITLE,
                'yaxis.title.text': NEW_YTITLE
            }
        },
        {
            desc: 'despite passing title only as a string (backwards-compatibility)',
            update: {
                title: NEW_TITLE,
                xaxis: {title: NEW_XTITLE},
                yaxis: {title: NEW_YTITLE}
            }
        },
        {
            desc: 'despite passing title only as a string using string attributes ' +
            '(backwards-compatibility)',
            update: {
                'title': NEW_TITLE,
                'xaxis.title': NEW_XTITLE,
                'yaxis.title': NEW_YTITLE
            }
        }
    ].forEach(function(testCase) {
        it('via `Plotly.relayout` ' + testCase.desc, function() {
            Plotly.relayout(gd, testCase.update);

            expectChangedTitles();
        });

        it('via `Plotly.update` ' + testCase.desc, function() {
            Plotly.update(gd, {}, testCase.update);

            expectChangedTitles();
        });
    });

    function expectChangedTitles() {
        expectTitles(NEW_TITLE, NEW_XTITLE, NEW_YTITLE);
    }

    function expectTitles(expTitle, expXTitle, expYTitle) {
        expectTitle(expTitle);

        var xTitleSel = d3.select('.xtitle');
        expect(xTitleSel.empty()).toBe(false, 'X-axis title element missing');
        expect(xTitleSel.text()).toBe(expXTitle);

        var yTitleSel = d3.select('.ytitle');
        expect(yTitleSel.empty()).toBe(false, 'Y-axis title element missing');
        expect(yTitleSel.text()).toBe(expYTitle);
    }
});

function expectTitle(expTitle) {
    expectTitleFn(expTitle)();
}

function expectTitleFn(expTitle) {
    return function() {
        expect(titleSel().text()).toBe(expTitle);
    };
}

function expectDefaultCenteredPosition(gd) {
    var containerBB = gd.getBoundingClientRect();

    expect(titleX()).toBe(containerBB.width / 2);
    expect(titleY()).toBe(gd._fullLayout.margin.t / 2);
}

function titleX() {
    return Number.parseFloat(titleSel().attr('x'));
}

function titleY() {
    return Number.parseFloat(titleSel().attr('y'));
}

function titleSel() {
    var titleSel = d3.select('.infolayer .g-gtitle .gtitle');
    expect(titleSel.empty()).toBe(false, 'Title element missing');
    return titleSel;
}

describe('editable titles', function() {
    'use strict';

    var data = [{x: [1, 2, 3], y: [1, 2, 3]}];

    var gd;

    afterEach(destroyGraphDiv);

    beforeEach(function() {
        gd = createGraphDiv();
    });

    function checkTitle(letter, text, opacityOut, opacityIn) {
        var titleEl = d3.select('.' + letter + 'title');
        expect(titleEl.text()).toBe(text);
        expect(+(titleEl.node().style.opacity || 1)).toBe(opacityOut);

        var bb = titleEl.node().getBoundingClientRect(),
            xCenter = (bb.left + bb.right) / 2,
            yCenter = (bb.top + bb.bottom) / 2,
            done,
            promise = new Promise(function(resolve) { done = resolve; });

        mouseEvent('mouseover', xCenter, yCenter);
        setTimeout(function() {
            expect(+(titleEl.node().style.opacity || 1)).toBe(opacityIn);

            mouseEvent('mouseout', xCenter, yCenter);
            setTimeout(function() {
                expect(+(titleEl.node().style.opacity || 1)).toBe(opacityOut);
                done();
            }, interactConstants.HIDE_PLACEHOLDER + 50);
        }, interactConstants.SHOW_PLACEHOLDER + 50);

        return promise;
    }

    function editTitle(letter, attr, text) {
        return new Promise(function(resolve) {
            gd.once('plotly_relayout', function(eventData) {
                expect(eventData[attr]).toEqual(text, [letter, attr, eventData]);
                setTimeout(resolve, 10);
            });

            var textNode = document.querySelector('.' + letter + 'title');
            textNode.dispatchEvent(new window.MouseEvent('click'));

            var editNode = document.querySelector('.plugin-editable.editable');
            editNode.dispatchEvent(new window.FocusEvent('focus'));
            editNode.textContent = text;
            editNode.dispatchEvent(new window.FocusEvent('focus'));
            editNode.dispatchEvent(new window.FocusEvent('blur'));
        });
    }

    it('shows default titles semi-opaque with no hover effects', function(done) {
        Plotly.plot(gd, data, {}, {editable: true})
        .then(function() {
            return Promise.all([
                // Check all three titles in parallel. This only works because
                // we're using synthetic events, not a real mouse. It's a big
                // win though because the test takes 1.2 seconds with the
                // animations...
                checkTitle('x', 'Click to enter X axis title', 0.2, 0.2),
                checkTitle('y', 'Click to enter Y axis title', 0.2, 0.2),
                checkTitle('g', 'Click to enter Plot title', 0.2, 0.2)
            ]);
        })
        .then(done);
    });

    it('has hover effects for blank titles', function(done) {
        Plotly.plot(gd, data, {
            xaxis: {title: {text: ''}},
            yaxis: {title: {text: ''}},
            title: {text: ''}
        }, {editable: true})
        .then(function() {
            return Promise.all([
                checkTitle('x', 'Click to enter X axis title', 0, 1),
                checkTitle('y', 'Click to enter Y axis title', 0, 1),
                checkTitle('g', 'Click to enter Plot title', 0, 1)
            ]);
        })
        .then(done);
    });

    it('has no hover effects for titles that used to be blank', function(done) {
        Plotly.plot(gd, data, {
            xaxis: {title: {text: ''}},
            yaxis: {title: {text: ''}},
            title: {text: ''}
        }, {editable: true})
        .then(function() {
            return editTitle('x', 'xaxis.title.text', 'XXX');
        })
        .then(function() {
            return editTitle('y', 'yaxis.title.text', 'YYY');
        })
        .then(function() {
            return editTitle('g', 'title.text', 'TTT');
        })
        .then(function() {
            return Promise.all([
                checkTitle('x', 'XXX', 1, 1),
                checkTitle('y', 'YYY', 1, 1),
                checkTitle('g', 'TTT', 1, 1)
            ]);
        })
        .then(done);
    });

});
