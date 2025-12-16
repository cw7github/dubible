#!/bin/bash

# Process all books with cross-reference cleanup
books=(
  "luke" "john" "acts" "romans" "1corinthians" "2corinthians"
  "galatians" "ephesians" "philippians" "colossians"
  "1thessalonians" "2thessalonians" "1timothy" "2timothy"
  "titus" "philemon" "hebrews" "james" "1peter" "2peter"
  "1john" "2john" "3john" "jude" "revelation"
  "genesis" "exodus" "leviticus" "numbers" "deuteronomy"
  "joshua" "judges" "ruth" "1samuel" "2samuel" "1kings" "2kings"
  "1chronicles" "2chronicles" "ezra" "nehemiah" "esther" "job"
  "psalms" "proverbs" "ecclesiastes" "songofsolomon"
  "isaiah" "jeremiah" "lamentations" "ezekiel" "daniel"
  "hosea" "joel" "amos" "obadiah" "jonah" "micah" "nahum"
  "habakkuk" "zephaniah" "haggai" "zechariah" "malachi"
)

for book in "${books[@]}"; do
  echo "Processing $book..."
  npx tsx scripts/cleanup-cross-refs-in-words.ts --book "$book" 2>&1 | grep "Done"
done

echo ""
echo "All books processed!"
