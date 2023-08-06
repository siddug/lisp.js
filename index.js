function tokenizeListOftokens(seriesOfTokens) {
    if (seriesOfTokens.length === 0) {
        return [];
    } else {
        if (seriesOfTokens[0] === "(") {
            var openBrackets = 0;
            var closingBracketIndex = -1;
            for (var i = 0; i < seriesOfTokens.length; i++) {
                if (seriesOfTokens[i] === "(") {
                    openBrackets++;
                } else if (seriesOfTokens[i] === ")") {
                    openBrackets--;
                    if (openBrackets === 0) {
                        closingBracketIndex = i;
                        break;
                    }
                }
            }

            var tokensOfthisBracket = seriesOfTokens
                .substring(1, closingBracketIndex)
                .trim();
            var restOfTheTokens = seriesOfTokens
                .substring(closingBracketIndex + 1)
                .trim();

            return [
                {
                    children: [...tokenizeListOftokens(tokensOfthisBracket)],
                },
                ...tokenizeListOftokens(restOfTheTokens),
            ];
        } else {
            if (seriesOfTokens[0] === '"') {
                return [
                    {
                        type: "string",
                        stringContent: seriesOfTokens.substring(
                            1,
                            seriesOfTokens.indexOf('"', 1)
                        ),
                    },
                    ...tokenizeListOftokens(
                        seriesOfTokens
                            .substring(seriesOfTokens.indexOf('"', 1) + 1)
                            .trim()
                    ),
                ];
            } else {
                // get first word
                var firstSpaceIndex = seriesOfTokens.indexOf(" ");
                if (firstSpaceIndex === -1) {
                    firstSpaceIndex = seriesOfTokens.length;
                }
                var firstWord = seriesOfTokens.substring(0, firstSpaceIndex);
                var restOfTheTokens = seriesOfTokens
                    .substring(firstSpaceIndex + 1)
                    .trim();

                if (!isNaN(firstWord)) {
                    // it is a number
                    return [
                        {
                            type: "number",
                            number: Number(firstWord),
                        },
                        ...tokenizeListOftokens(restOfTheTokens),
                    ];
                } else {
                    // it is a symbol
                    return [
                        {
                            type: "symbol",
                            symbol: firstWord,
                        },
                        ...tokenizeListOftokens(restOfTheTokens),
                    ];
                }
            }
        }
    }
}

function tokenizer(perfectCommand) {
    if (perfectCommand.length > 0) {
        if (perfectCommand[0] === "(") {
            var restOfCommand = perfectCommand
                .substring(1, perfectCommand.length - 1)
                .trim();
            if (restOfCommand.length === 0) {
                return {
                    children: [],
                };
            }

            return {
                children: tokenizeListOftokens(restOfCommand),
            };
        }
    } else {
        return {
            children: [],
        };
    }
}

function parser(lisp) {
    // let's remove comments
    lisp = lisp
        .split("\n")
        .map((x) => x.split(";")[0])
        .join("\n");

    // let's convert lisp into well-formed individual statements
    // (+ 2 3) -> individual statement
    // (list 2 3) -> individual statement
    var statements = [];
    var openBrackets = 0;
    var currentStatement = "";
    for (var i = 0; i < lisp.length; i++) {
        var token = lisp[i];
        currentStatement += token;
        if (token === "(") {
            openBrackets++;
        }
        if (token === ")") {
            openBrackets--;
            if (openBrackets === 0) {
                statements.push(currentStatement);
                currentStatement = "";
            }
        }
    }

    if (openBrackets !== 0) {
        throw new Error("Unbalanced brackets");
    }
    if (currentStatement.length > 0) {
        statements.push(currentStatement);
    }

    // now we have individual well formed statements to work on.
    var tokenizedStatements = statements
        .filter((x) => x)
        .map((x) => x.trim())
        .filter((x) => x)
        .map((statement) => {
            statement = statement.trim();
            // now let's parse the final structured statement
            var tokens = tokenizer(statement);
            return {
                statement,
                tokens,
            };
        });

    return tokenizedStatements;
}

function interpret(statement, env) {
    var children = statement.children;
    var type = statement.type;

    if (type === "number") {
        return Number(statement.number);
    } else if (type === "string") {
        return statement.stringContent;
    } else if (type === "symbol") {
        return env[statement.symbol];
    }

    var firstItem = null;
    var rest = null;

    if (children.length > 0) {
        firstItem = children[0];
        rest = children.slice(1);
    } else {
    }

    var type = firstItem.type;

    if (type === "symbol") {
        var symbol = firstItem.symbol;

        if (symbol === "list") {
            return [...rest.map((x) => interpret(x, env))];
        } else if (symbol === "first") {
            return [...interpret(rest[0], env)][0];
        } else if (symbol === "rest") {
            return [...interpret(rest[0], env)].slice(1);
        } else if (symbol === "last") {
            return [...interpret(rest[0], env)].slice(-1)[0];
        } else if (symbol === "cons") {
            const firstRest = rest[0];
            const restRest = rest[1];
            return [interpret(firstRest, env), ...interpret(restRest, env)];
        } else if (symbol === "append") {
            return rest
                .map((x) => interpret(x, env))
                .reduce((a, b) => a.concat(b), []);
        } else if (symbol === "length") {
            return [...interpret(rest[0], env)].length;
        } else if (symbol === "+") {
            return [...rest.map((x) => interpret(x, env))].reduce(
                (a, b) => a + b,
                0
            );
        } else if (symbol === "-") {
            const nums = [...rest.map((x) => interpret(x, env))];
            if (nums.length === 0) {
                return 0;
            } else if (nums.length === 1) {
                return -1 * nums[0];
            } else {
                return nums[0] - nums.slice(1).reduce((a, b) => a + b, 0);
            }
        } else if (symbol === "*") {
            return [...rest.map((x) => interpret(x, env))].reduce(
                (a, b) => a * b,
                1
            );
        } else if (symbol === "/") {
            return [...rest.map((x) => interpreter(x, env))].reduce(
                (a, b) => a / b,
                0
            );
        } else if (symbol === "%") {
            return [...rest.map((x) => interpreter(x, env))].reduce(
                (a, b) => a % b,
                0
            );
        } else if (symbol === ">") {
            const firstRest = rest[0];
            const restRest = rest[1];
            return interpret(firstRest, env) > interpret(restRest, env);
        } else if (symbol === "<") {
            const firstRest = rest[0];
            const restRest = rest[1];
            return interpret(firstRest, env) < interpret(restRest, env);
        } else if (symbol === ">=") {
            const firstRest = rest[0];
            const restRest = rest[1];
            return interpret(firstRest, env) >= interpret(restRest, env);
        } else if (symbol === "<=") {
            const firstRest = rest[0];
            const restRest = rest[1];
            return interpret(firstRest, env) <= interpret(restRest, env);
        } else if (symbol === "eql") {
            const firstRest = rest[0];
            const restRest = rest[1];
            return interpret(firstRest, env) === interpret(restRest, env);
        } else if (symbol === "or") {
            return rest.map((x) => interpret(x, env)).some((x) => x);
        } else if (symbol === "and") {
            return rest.map((x) => interpret(x, env)).every((x) => x);
        } else if (symbol === "let") {
            const firstRest = rest[0];
            const restRest = rest.slice(1);
            const newEnv = { ...env };
            for (var i = 0; i < firstRest.children.length; i++) {
                const child = firstRest.children[i];
                const symbol = child.children[0].symbol;
                const value = interpret(child.children[1], env);
                newEnv[symbol] = value;
            }
            return interpret(restRest[restRest.length - 1], newEnv);
        } else if (symbol === "set") {
            const firstRest = rest[0];
            const restRest = rest.slice(1);
            const symbol = firstRest.symbol;
            const value = interpret(restRest[0], env);
            env[symbol] = value;
            return value;
        } else if (symbol === "define") {
            const firstRest = rest[0];
            const restRest = rest.slice(1);
            const fnName = firstRest.children[0].symbol;
            const fnArgs = firstRest.children.slice(1).map((x) => x.symbol);
            const fnBody = restRest[0];
            env[fnName] = {
                fnArgs,
                fnBody,
            };
            return fnName;
        } else if (symbol === "if") {
            const firstRest = rest[0];
            const secondRest = rest[1];
            const thirdRest = rest[2];
            const condition = interpret(firstRest, env);
            if (condition) {
                return interpret(secondRest, env);
            } else if (thirdRest) {
                return interpret(thirdRest, env);
            } else {
                return false;
            }
        } else {
            // check if this is a function call
            if (env[symbol] && env[symbol].fnArgs) {
                const fnArgs = env[symbol].fnArgs;
                const fnBody = env[symbol].fnBody;
                const newEnv = { ...env };
                for (var i = 0; i < fnArgs.length; i++) {
                    newEnv[fnArgs[i]] = interpret(rest[i], newEnv);
                }
                return interpret(fnBody, newEnv);
            } else {
                return env[symbol];
            }
        }
    }
}

function interpreter(statements, env, debug) {
    return statements.map((s) => {
        const eval = interpret(s.tokens, env);

        return {
            ...s,
            eval,
            ...(debug
                ? {
                      env: JSON.parse(JSON.stringify(env)),
                  }
                : {}),
        };
    });
}

var lisp = `
(+ 2 3)
(list 2 3)
(list 1 (+ 2 3) 4 "sid")
(first (list 1 2 3))
(rest (list 1 2 3))
(cons 2 (list 1 2 3))
(length (list 1 2))
(let ((x 10) (y 20))
 (+ x y))
(define (square x) (* x x))
(square 2)
(set x (list 1 2 3))
(set x 40)
(square x)
(define (sum-of-squares x y)
 (+ (square x) (square y)))
(sum-of-squares 3 4)
(> 2 4)
(if (> 2 4) "two is > 4" "lesser")
(define (! x) (if (< x 1) 1 (* x (! (- x 1)))))
(! 5)
(define (fibo x) (if (or (eql x 0) (eql x 1)) 1 (+ (fibo (- x 1)) (fibo (- x 2)))))
(fibo 10)
(define 
	(reverse lst) 
	(if (eql (length lst) 0) 
		(list)
		(append (reverse (rest lst)) (list (first lst)))
	)
)
(reverse (list 1 2 3 4 5))
`;

var env = {};
const parsedOutput = parser(lisp);
console.log(parsedOutput);
const interpretedOutput = interpreter(parser(lisp), env, (debug = true));
for (const x of interpretedOutput) {
    console.log(`${x.statement} => ${x.eval}`, x.env);
}

/*
	practice problems (doesn't require new syntax)):
	- Find kth element of a list
	- Find if a list is a palindrome
	- Find index of an element in list
	- Find minimum of an element in list
	- Find if a list is sorted
	- Find if a list has an element in it
	- Intersection of lists
	
	practice problems (add loop syntax):
	- Find if a number is a prime

    practice ux problems:
    - Given a proper list statement, pretty print it with proper indentation (raise a PR to the repo)

    practice library problems:
    - Add forms to enable lisp-js to access DOM (example: (document.getElementById "id"))
*/
