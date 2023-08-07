/*
    Given a series of tokens,
    // (+ 2 3) -> well-formed individual statement
    // + 2 3 -> list of tokens
    // list 1 2 "sid" (list 1 2) -> list of tokens
    process it from left to right and return a array of analyzed tokens
    // supported tokens
    // 1. number
    // 2. string
    // 3. symbol --> anything that is not number of string or a bracket
    // whenever a ( is encountered, tokenize the list of tokens inside the bracket in a separate object
*/
function tokenizer(seriesOfTokens) {
    if (seriesOfTokens.length === 0) {
        return [];
    }

    // The first token in the list is a well-formed individual statement
    if (seriesOfTokens[0] === "(") {
        // find the closing bracket
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

        // list of tokens inside this bracket
        var tokensOfthisBracket = seriesOfTokens
            .substring(1, closingBracketIndex)
            .trim();

        // rest of the tokens;
        // remember seriesOfTokens might not be a well-formed individual statement.
        // so there can be more tokens left to process.
        // example if the original statement sent to tokenizer is (list 1 2) 3 4
        // then we are going to tokenize (list 1 2) and 3 4 separately
        var restOfTheTokens = seriesOfTokens
            .substring(closingBracketIndex + 1)
            .trim();

        return [
            {
                children: [...tokenizer(tokensOfthisBracket)],
            },
            ...tokenizer(restOfTheTokens),
        ];
    }

    // The first element in the list is the tokens is a string.
    // strip the string and tokenize the rest of the tokens
    if (seriesOfTokens[0] === '"') {
        return [
            {
                type: "string",
                stringContent: seriesOfTokens.substring(
                    1,
                    seriesOfTokens.indexOf('"', 1)
                ),
            },
            ...tokenizer(
                seriesOfTokens
                    .substring(seriesOfTokens.indexOf('"', 1) + 1)
                    .trim()
            ),
        ];
    }

    // Not a string. Not a (). What else could it be? analyze first word
    var firstSpaceIndex = seriesOfTokens.indexOf(" ");
    if (firstSpaceIndex === -1) {
        firstSpaceIndex = seriesOfTokens.length;
    }
    var firstWord = seriesOfTokens.substring(0, firstSpaceIndex);
    var restOfTheTokens = seriesOfTokens.substring(firstSpaceIndex + 1).trim();

    if (!isNaN(firstWord)) {
        // it is a number
        return [
            {
                type: "number",
                number: Number(firstWord),
            },
            ...tokenizer(restOfTheTokens),
        ];
    }

    // it is a symbol. return it as it is. tokenizer is not smart enough to analyze what it is.
    // it just says it is something to analyze
    return [
        {
            type: "symbol",
            symbol: firstWord,
        },
        ...tokenizer(restOfTheTokens),
    ];
}

/*
    Given lisp code,
    1. Parse it into well-formed individual statements
    2. Use tokenizer to tokenize each statement
*/
function parser(lisp) {
    // let's remove comments
    // comment starts with ; and can appear in any line.
    lisp = lisp
        .split("\n")
        .map((x) => x.split(";")[0])
        .join("\n");

    // let's convert lisp into well-formed individual statements
    // (+ 2 3) -> well-formed individual statement
    // (list 2 3) -> another well-formed individual statement
    // simple brute-force algorithm to parse the lisp code character by character and splitting based on
    // open and closing brackets
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

    // now we have individual well formed statements to work on
    // use tokenizer to tokenize each statement
    var tokenizedStatements = statements
        .filter((x) => x)
        .map((x) => x.trim())
        .filter((x) => x)
        .map((statement) => {
            var tokens = tokenizer(statement);

            var tokenizedStatement = {
                children: tokens,
            }; // OR tokens[0]

            // interpreter works on whole formed individual statements that are represented by objects
            // tokenizer returns a list of tokens which themselves are objects
            // so we can either send tokens[0] as the statement to interpreter
            // OR
            // form a wrapped object with children as tokens and send it to interpreter
            // we are doing the latter because it is fun

            return {
                statement,
                tokenizedStatement,
            };
        });

    return tokenizedStatements;
}

/*
    Given a tokenized statement, interpret/ evaluate it and return the result
    env is the environment in which the statement is interpreted
 */
function interpret(statement, env) {
    var type = statement.type;

    // If we are dealing with atomic step
    // i.e, 1 2 3 "sid" list square etc.
    // return it's value from environment
    if (type === "number") {
        return Number(statement.number);
    } else if (type === "string") {
        return statement.stringContent;
    } else if (type === "symbol") {
        return env[statement.symbol];
    }

    // If it is not atomic, then it must have children
    var children = statement.children;
    // First children gives us the type of the statement to interpret
    var firstItem = children[0];
    var rest = children.slice(1);
    var type = firstItem.type;

    if (type === "symbol") {
        // If it is a symbol, then it is a special form or a function call
        var symbol = firstItem.symbol;
        // "rest" then becomes the arguments to the special form or function call

        // Special forms that we support
        if (symbol === "list") {
            return [...rest.map((x) => interpret(x, env))];
        } else if (symbol === "first") {
            return [...interpret(rest[0], env)][0];
        } else if (symbol === "rest") {
            return [...interpret(rest[0], env)].slice(1);
        } else if (symbol === "last") {
            return [...interpret(rest[0], env)].slice(-1)[0];
        } else if (symbol === "cons") {
            return [interpret(rest[0], env), ...interpret(rest[1], env)];
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
                // (-) -> 0
                return 0;
            } else if (nums.length === 1) {
                // (- 2) => -2
                return -1 * nums[0];
            }
            // (- a b c) => a - b - c
            return nums[0] - nums.slice(1).reduce((a, b) => a + b, 0);
        } else if (symbol === "*") {
            return [...rest.map((x) => interpret(x, env))].reduce(
                (a, b) => a * b,
                1
            );
        } else if (symbol === "/") {
            return [...rest.map((x) => interpret(x, env))].reduce(
                (a, b) => a / b,
                0
            );
        } else if (symbol === "%") {
            return [...rest.map((x) => interpret(x, env))].reduce(
                (a, b) => a % b,
                0
            );
        } else if (symbol === ">") {
            return interpret(rest[0], env) > interpret(rest[1], env);
        } else if (symbol === "<") {
            return interpret(rest[0], env) < interpret(rest[1], env);
        } else if (symbol === ">=") {
            return interpret(rest[0], env) >= interpret(rest[1], env);
        } else if (symbol === "<=") {
            return interpret(rest[0], env) <= interpret(rest[1], env);
        } else if (symbol === "eql") {
            return interpret(rest[0], env) === interpret(rest[1], env);
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
    } else {
        return interpret(firstItem, env);
    }
}

// Given a list of parsed statements, interpret them and return the result
// env is the environment in which the statements are interpreted
// for debugging purposes, we can pass debug=true to get the environment at each step
function interpreter(parsedStatements, env, debug) {
    return parsedStatements.map((s) => {
        const eval = interpret(s.tokenizedStatement, env);

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
