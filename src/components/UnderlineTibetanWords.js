import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

/**
 * Underlines Tibetan syllables that match conventions in the provided Map.
 * Similar to UnderlineAbbreviation but with special handling for Tibetan text.
 * Pass { conventionMap: Map<string, string> } in configure().
 */
export const UnderlineTibetanWords = Extension.create({
  name: "underlineTibetanWords",

  addOptions() {
    return {
      conventionMap: new Map(), // Map of convention -> expansion
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: ({ doc }) => {
            const decorations = [];
            const conventionMap = this.options.conventionMap;
            
            if (!conventionMap || conventionMap.size === 0) return null;

            doc.descendants((node, pos) => {
              if (!node.isText) return;
              
              // Tibetan text is segmented by tsheg (་), shad (།) and spaces
              const text = node.text;
              let lastIndex = 0;
              
              // Split the text by Tibetan delimiters (་ tsheg, ། shad, spaces)
              const delimiterPattern = /[་།\s]+/g;
              let match;
              
              while ((match = delimiterPattern.exec(text)) !== null) {
                if (lastIndex < match.index) {
                  const syllable = text.slice(lastIndex, match.index);
                  
                  // Only underline if it's in the convention map
                  if (conventionMap.has(syllable)) {
                    const from = pos + lastIndex;
                    const to = pos + match.index;
                    const expansion = conventionMap.get(syllable);
                    
                    decorations.push(
                      Decoration.inline(from, to, {
                        class: "underline-tibetan-word",
                        "data-convention": syllable,
                        "data-expansion": expansion,
                        "data-abbr-from": from,
                        "data-abbr-to": to,
                      })
                    );
                  }
                }
                lastIndex = match.index + match[0].length;
              }
              
              // Handle the last syllable if there is one
              if (lastIndex < text.length) {
                const syllable = text.slice(lastIndex);
                
                if (conventionMap.has(syllable)) {
                  const from = pos + lastIndex;
                  const to = pos + text.length;
                  const expansion = conventionMap.get(syllable);
                  
                  decorations.push(
                    Decoration.inline(from, to, {
                      class: "underline-tibetan-word",
                      "data-convention": syllable,
                      "data-expansion": expansion,
                      "data-abbr-from": from,
                      "data-abbr-to": to,
                    })
                  );
                }
              }
            });

            return decorations.length
              ? DecorationSet.create(doc, decorations)
              : null;
          },
        },
      }),
    ];
  },
});
