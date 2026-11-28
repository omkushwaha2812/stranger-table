import {cache} from 'react';
import {requireStudent} from './auth';
import {read} from './store/db';
import {myPassport} from './store/core';
export const loadPassport = cache(async function loadPassport() {
  const {profile} = await requireStudent();
  return read(d => myPassport(d, profile.id));
});
