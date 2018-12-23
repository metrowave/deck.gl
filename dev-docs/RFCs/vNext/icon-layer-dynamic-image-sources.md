# RFC: Icon Manager 

* **Authors**: Xintong Xia 
* **Date**: December 2018
* **Status**: Draft 

## Abstract

This RFC proposes a way to allow IconLayer load image sources at runtime. 

## Motivation 

[IconLayer](/docs/layers/icon-layer.md) currently requires all icons pre-packed into a sprite image (`iconAtlas`) and a JSON descriptor (`iconMapping`). 
In some use cases, it is not possible to know the icons that will be used. Instead, each icon needs to be fetched from
a programmatically generated URL at runtime.
 
## Proposal - Extending current `getIcon` API

Change the `getIcon` API to allow user to return either a `string` or an `object`. 

- `string`: the behavior should be the same as before, return the icon name of each object, 
which is used to get icon descriptor from `iconMapping` and then to retrieve icon from `iconAtlas`. 
- `object`: the expected object should include `url`, `height`, `width` of the icon.

For example: 

```js
// return a string
getIcon: d => 'icon-1';

// return an object
getIcon: d => ({
  height: 32,
  width: 32,
  url: d.avatar_url 
});
```

### Mix pre-packed and dynamic URLs 

For the same `IconLayer`, `getIcon` could return `string` (name used to retrieve icon from pre-packed `iconAtlas`) 
for some data points, but return `object` (containing a url to fetch the icon) for others.

## Cost and Impact

The proposal will require the following changes:
- `IconManager` class: add a new class to help fetch icons and manage `iconMapping` and `iconAltas`.
- `iconMapping` and `iconAltas` from user pre-packed, and dynamically fetched. 

If implemented:
- Existing applications should not need change.
- Existing applications should not see visible difference in terms of behavior or performance.
