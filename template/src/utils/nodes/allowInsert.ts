import type { Tag, FlatNode } from "@/types.ts";

const allowInsert = (
  node: FlatNode,
  tagName: Tag,
  tagNameNew: Tag,
  tagNameAdjacent?: Tag
): boolean => {
  switch (tagName) {
    case "p":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "ul":
    case "ol":
      {
        switch (tagNameNew) {
          case "bunny":
          case "yt":
          case "belief":
          case "toggle":
          case "identify":
          case "signup":
          case "img":
            if (tagName === `ul` || tagNameAdjacent === `ul`) return false;
            return true;
          case "p":
          case "h2":
          case "h3":
          case "h4":
          case "h5":
            if (!tagNameAdjacent) return true;
            switch (tagNameAdjacent) {
              case "p":
              case "h2":
              case "h3":
              case "h4":
              case "h5":
              case "ul":
              case "ol":
                return true;

              default:
                console.log(
                  `1 miss on allowInsert: tagName:${tagName} tagNameNew:${tagNameNew} tagNameAdjacent:${tagNameAdjacent}`
                );
            }
            break;

          default:
            console.log(
              `2 miss on allowInsert: tagName:${tagName} tagNameNew:${tagNameNew} tagNameAdjacent:${tagNameAdjacent}`
            );
        }
      }
      break;

    case "li": {
      switch (tagNameNew) {
        case "bunny":
        case "yt":
        case "belief":
        case "toggle":
        case "identify":
        case "signup":
          return false;
        case "img":
          if (node.tagNameCustom === `img` && tagNameAdjacent !== `ul`) return true;
          return false;
        case "p":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
          if (node.tagNameCustom && [`p`, `h2`, `h3`, `h4`, `h5`].includes(node.tagNameCustom))
            // treat these as li, unless this li is for image or widget
            return true;
          return false;
        default:
          console.log(
            `3 miss on allowInsert: tagName:${tagName} tagNameNew:${tagNameNew} tagNameAdjacent:${tagNameAdjacent}`
          );
      }
      break;
    }

    default:
      console.log(
        `miss on allowInsert: tagName:${tagName} tagNameNew:${tagNameNew} tagNameAdjacent:${tagNameAdjacent}`
      );
  }
  return false;
};

export default allowInsert;
