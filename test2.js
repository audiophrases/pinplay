const prompt = "Correct1 correct2 incorrect1 incorrect2.";
const corrected = "Correct1 correct2 correct3 correct4.";

function tokenizeWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean);
}

function normalizeTextAnswer(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[~`!@#$%^&*(){}\[\];:"'<,>.?\/\\|\-_+=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countErrorHuntRequiredTokens(prompt, correctedStr) {
    const source = tokenizeWords(prompt).map(normalizeTextAnswer);
    const target = tokenizeWords(correctedStr).map(normalizeTextAnswer);
    
    const rows = source.length + 1;
    const cols = target.length + 1;
    const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

    for (let i = 0; i < rows; i++) dp[i][0] = i;
    for (let j = 0; j < cols; j++) dp[0][j] = j;

    for (let i = 1; i < rows; i++) {
        for (let j = 1; j < cols; j++) {
            if (source[i - 1] === target[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],       // Deletion
                    dp[i][j - 1],       // Insertion
                    dp[i - 1][j - 1]    // Substitution
                );
            }
        }
    }

    let i = source.length;
    let j = target.length;
    const errorIndexes = new Set();

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && source[i - 1] === target[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
            i--; j--;
        } else {
            console.log(`Backtracking at i=${i}, j=${j}, dp[i][j]=${dp[i][j]}`);
            if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
                errorIndexes.add(i - 1);
                i--; j--;
            } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
                errorIndexes.add(i - 1);
                i--;
            } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
                errorIndexes.add(Math.max(0, i - 1));
                j--;
            } else {
                if (i > 0) i--;
                else j--;
            }
        }
    }
    return errorIndexes.size;
}

console.log(countErrorHuntRequiredTokens(prompt, corrected));
