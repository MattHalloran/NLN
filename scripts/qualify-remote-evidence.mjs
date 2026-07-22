#!/usr/bin/env node
import { ContractError, assertExactKeys, assertFresh, parseOptions, publishJsonNoOverwrite, readJson, sha256File } from "./lib/phase10-safe-io.mjs";

const [command,...argv]=process.argv.slice(2);
const requiredCapabilities=["tls","versioning-or-object-lock","server-side-encryption","credential-separation","retention-configuration"];
try{
 const o=parseOptions(argv);if(!["publication","resilience"].includes(command)||!o.output)throw new ContractError("Usage: qualify-remote-evidence.mjs publication|resilience [options] --output FILE",2);
 const now=new Date(o.now??Date.now());
 if(command==="publication"){
  for(const key of ["publication-receipt","capability-receipt"])if(!o[key])throw new ContractError(`--${key} is required`,2);
  const publication=readJson(o["publication-receipt"],"publication receipt"),capability=readJson(o["capability-receipt"],"provider capability receipt");
  if(publication.status!=="success"||publication.receiptType!=="nln-runtime-state-remote-publication")throw new ContractError("exact successful publication receipt required");
  assertExactKeys(capability,{required:["schemaVersion","receiptType","status","scope","providerId","policySha256","observedAt","expiresAt","capabilities"]},"provider capability receipt");
  if(capability.schemaVersion!==1||capability.receiptType!=="remote-provider-capability"||capability.status!=="success"||capability.scope!=="fixture")throw new ContractError("exact fixture provider capability evidence required");
  assertFresh(capability.observedAt,Number(o["max-age-seconds"]??86400),now);if(Date.parse(capability.expiresAt)<now.getTime())throw new ContractError("provider capability evidence expired");
  const observed=new Map(capability.capabilities.map(x=>[x.id,x]));for(const id of requiredCapabilities)if(observed.get(id)?.status!=="verified"||!observed.get(id)?.evidenceSha256?.match(/^[0-9a-f]{64}$/))throw new ContractError(`provider capability is not evidenced: ${id}`);
  publishJsonNoOverwrite(o.output,{schemaVersion:1,receiptType:"runtime-state-remote-download-verification",status:"success",scope:"fixture",finishedAt:now.toISOString(),policy:{sha256:capability.policySha256},archive:{sha256:publication.sourceArchiveSha256??publication.archiveSha256},publicationReceiptSha256:sha256File(o["publication-receipt"]),providerCapabilityReceiptSha256:sha256File(o["capability-receipt"]),providerId:capability.providerId,assuranceStates:["encrypted-published","remote-download-verified"],resilienceQualified:false});
 }else{
  if(!o.copies)throw new ContractError("--copies is required",2);const manifest=readJson(o.copies,"resilience copy manifest");assertExactKeys(manifest,{required:["schemaVersion","scope","copies"]},"resilience copy manifest");
  if(manifest.scope!=="fixture"||!Array.isArray(manifest.copies))throw new ContractError("fixture copy evidence required");const locations=new Set(),media=new Set();let offsite=0,archive=null;
  for(const copy of manifest.copies){assertExactKeys(copy,{required:["copyId","locationId","mediaType","offsite","archiveSha256","evidencePath"]},"resilience copy");if(locations.has(copy.locationId))throw new ContractError("copies are not independently located");locations.add(copy.locationId);media.add(copy.mediaType);if(copy.offsite===true)offsite++;if(archive&&archive!==copy.archiveSha256)throw new ContractError("copy archive identities differ");archive=copy.archiveSha256;readJson(copy.evidencePath,"copy evidence");}
  if(locations.size<3||media.size<2||offsite<1)throw new ContractError("copy evidence does not satisfy 3-2-1 resilience");publishJsonNoOverwrite(o.output,{schemaVersion:1,receiptType:"runtime-state-resilience-qualification",status:"success",scope:"fixture",finishedAt:now.toISOString(),archive:{sha256:archive},copyCount:locations.size,mediaTypeCount:media.size,offsiteCopyCount:offsite,copies:manifest.copies.map(x=>({copyId:x.copyId,evidenceSha256:sha256File(x.evidencePath)}))});
 }
 console.log(command==="publication"?"Remote publication and provider capabilities qualified; resilience remains separate":"3-2-1 fixture resilience qualified");
}catch(error){console.error(`Remote evidence rejected: ${error.message}`);process.exit(error.exitCode??1);}
