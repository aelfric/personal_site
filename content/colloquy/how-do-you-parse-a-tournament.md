---
title:  How do you Parse a Tournament?
description: In this next article in my series about generating awards certificates for speech and debate tournaments, we learn that parsing CSV is easy, but interpreting data is hard.
tags: stuff_i_wrote, colloquy
img: https://frankriccobono.com/assets/images/data.jpg
img_width: 1080
img_height: 810
created_at: 2026-06-16
kind: article
---

This article is a continuation of my series on how I created the certificate generator for our local speech and debate league.  

[Alistair Cockburn](https://alistaircockburn.com/) describes the "walking skeleton" of your system as "a minimal implementation of a system that is functional from end to end".  He suggests you write that first and then expand to cover the edge cases.

In the previous article, I mentioned that it is possible to export results from the tournament management software ([Tabroom](https://www.tabroom.com)) as comma-separated value (CSV) text files.  In this next part, I'll talk about how I addressed our core use case by converting those CSV results files into the data model used to render the certificates.  Then I'll start examining how the parser has evolved to address new use cases I didn't envision in the first few commits.
## Interpreting Results
In a competitive speech tournament, students compete in one of several speaking events. In each event, groups of five to seven students give short performances in front of a judge, who then ranks the competitors according to objective and subjective criteria.  Tournaments usually consist of multiple preliminary rounds where students are randomly paired against each other. Students'  final placements are determined by adding up the ranks from each prelim round and applying a tournament-specific set of tiebreakers.  At the end of the tournament, we can get the final results for each event in a format like this.

```csv
Ranking,Code,Name 1,School,Ranks in Prelims,Reciprocals in Prelims, Points in Prelims
1,"807","John Smith","Some Academy",4.00,2.50,286
2,"804","Jane Doe","P.S. 1337",5.00,2.33,278  
3,"802","Mary Mack","Williams Prep",6.00,2.25,278
```

The first three columns are fairly generic. The remaining columns will depend on what set of tiebreakers we decide to use.  
- `Ranking` is the student's overall placement. In this example, John Smith was ranked first overall, Jane was second, and Mary was third. 
- `Code` is a unique identifier for each entry in the event.  We use this to preserve some anonymity while the tournament is in progress.
- `Name 1` is the student's full name.  You may wonder why it's `Name 1` instead of `Name`. We'll get back to that later.
- `School` is the school this student is affiliated with.  We are an academic competition, and each student is part of a school team.

The full data model consists of several entities. In short, a `Tournament` consists of one or more `Events`.  Each `Event` would conclude with one or more `Results`.  Each `Result` is attributed to the `School` that the entry attends.  The initial structure of the `Result` entity is below. It's a direct translation of the first four columns in the CSV, plus an auto-incrementing primary key. 

```java
@Entity
public class Result {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    long id;
    int place;
    String code;
    String name;
    School school; // foreign key reference
    
    // getters and setters omitted for brevity
}
```
## Aside: How to Parse CSV
Now that we have sample data, we can consider how to extract it from the file.  CSV is a deceptively simple format.  Many developers might instinctively reach for the naive approach: read the file line by line and split each line by commas.  Some of the fields are wrapped in quotes, so those could be stripped out.

```java
import module java.base;

class ReadFile {
	public static void main(String args[]) {
		try (BufferedReader src = Files.newBufferedReader(
			Paths.get("/path/to/file.csv"),
			StandardCharsets.UTF_8);){
			String line = src.readLine();
			String[] columns = line.split(",");
			String rank = columns[0];
			String name = columns[2].replace("\"","");
			String school = columns[3];
			// do something with the results
		} catch (IOException ioe) {
			// do something to recover from the error
			ioe.printStackTrace();
		}
	}
}
```

In very simple cases, this may seem to work, but it breaks down fairly quickly. Consider what happens when the column value contains a comma.  For example, we had two schools in our league known as "Convent of the Sacred Heart, NYC" and "Convent of the Sacred Heart, Greenwich".  If we chop off the part of these names after the comma, we will certainly cause some confusion.

Aside from nested commas, the use of column position is also a limitation of this approach.  The header row contains important semantic information about each column, but if we are just splitting strings, we discard that information and become tightly coupled to the _order_ of information in the file.  Since we don't control the producer of the CSV file, we can't guarantee every column will always have the same order.  I already mentioned that the last few columns will almost certainly differ from one tournament to another.  Even if we do control the output order, it means that any new columns we introduce in the future must always be appended to the end to avoid incompatibility.

A better approach is to use a proper CSV parser.  For this project, I chose [Apache Commons CSV](https://commons.apache.org/proper/commons-csv/) because I had already used it on a prior project.  Parsing with this library looks like this:

```java
CSVFormat CSV_FORMAT = CSVFormat.Builder
      .create(CSVFormat.DEFAULT)
      .setHeader()
      .setSkipHeaderRecord(true)
      .setAllowMissingColumnNames(true)
      .get();
      
CSVParser parse = CSV_FORMAT.parse(inputStream);

for (CSVRecord record : parse.getRecords()) {
    String ranking = record.get("Ranking");
    String name = record.get("Name 1");
    // ...etc
}
```

The `DEFAULT` format assumes a comma (`,`) is the delimiter, a double quote (`"`) is used to surround values that might contain the delimiter, and Windows-style line endings (`\r\n`) are used to separate rows.  The last three directives instruct the parser to interpret the first row as named headers, allowing you to access values by name rather than by index.

One limitation, though, is that the `CSVRecord` class only returns string values, so I also needed to use `Integer.parseInt(record.get("Ranking"))` to get the numeric value for `place`.

## What's in a `Name 1`?
 Back in 2020, I hadn't read any Cockburn, but I had built a decent walking skeleton all the same. The first iteration of the software successfully processed all the results from our first speech tournament and generated certificates without issue, but it promptly fell over after our second tournament a week later.

I mentioned students can compete in multiple events, each of which has a somewhat different format.  Our second tournament of the year was the first one that season to offer an event called Duo Interpretation. In this event, as the name suggests, teams of two students perform a short acting piece together.  When it came time to ingest the results of this event, I noticed that the certificates only displayed the names of one of the two team members. 

It turned out that in partner events, `Name 1` would contain the name of one partner, and a new column,  `Name 2`, would contain the other partner's name.  Because I was already using column names rather than indexes, the fix was localized.

```java
List<String> headers = parse.getHeaderNames();

if (headers.contains("Name 2")) {
    result.name = csvRecord.get("Name 1") + " & " + csvRecord.get("Name 2");
} else {
     result.name = csvRecord.get("Name 1");
}
```

Note that, as a secondary benefit of referencing columns by name instead of index, it didn't matter that sometimes there was another column between `Name 1` and `School`.  Without this, we would have seen even stranger results, such as a certificate rewarding John Smith from the school of Jane Doe.

## When is a Place not a Place?

My troubles did not end there.  Even though we use various tiebreakers,  there are still sometimes unbreakable ties.  When all is said and done, two students or teams might have received exactly the same ranks throughout the day.  What I learned from this tournament was that when an unbreakable tie happens, the `Ranking` column in the results export indicates this with a prefix.  For example, if students were tied for second place, they would both be ranked as "T-2".  When this "T-2" value appeared in a result for the first time, my naive `Integer.parseInt(ranking)` failed with a `NumberFormatException`.  I had assumed `Ranking` was a numeric field, but the export treated it as richer information that encoded both the placement and whether that placement was tied.

The tactical fix for this was:

```java
result.place = Integer.parseInt(
    csvRecord.get("Ranking").replace("T-", ""));
```

## Is That Your Final Answer?
Unfortunately, this tournament was not done teaching me lessons. In larger events, we held a final round wherein the top 6 to 8 students competed against each other for final placement.  However, in the smaller events, we did not hold a final round.  Instead, we calculated the final places based purely on preliminary round scores.  When we got the results, I learned that some of the columns had completely different names when exporting the results from an event that did not have a final round versus one that did.  For example, in some cases `Ranking` was `Place`. In other cases, there was neither a `Name 1` nor `Name 2` column, but rather an already combined `Name` field.  

This variability led me to introduce a utility method to return the value for the first matching column name.

```java
 String getOrAlternateColumn(CSVRecord csvRecord, String... names) {
	for (String name : names) {
		if(csvRecord.isMapped(name)){
			return csvRecord.get(name);
		}
	}
	throw new IllegalArgumentException("Could not find any of " +
		Arrays.toString(names));
}
```
## Conclusion
I mentioned that CSV is a deceptively simple format.  Definitely don't parse it with string splitting, but, even if you do have column names, they may not guarantee a stable contract.  In the end, the hardest part of this project wasn't parsing the file, but understanding the assumptions behind the data.  What seemed like an easy challenge from a bird's-eye view ultimately exposed the need to handle several data quirks and special cases.  

Thankfully, because this logic was encapsulated in the parser, I was able to make these changes on the fly while limiting most of the complexity to the application boundary.  The parser needed to evolve, but the internal data model remained stable.
